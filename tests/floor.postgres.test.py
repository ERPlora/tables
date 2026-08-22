#!/usr/bin/env python3
"""Floor-service contract test (tables#12) — runs against a REAL Postgres 18 in Docker.

Why a SQL-level test: every defect in tables#12 is a *SQL semantics* defect. The WASM handler
only builds intentions (unit-tested in `handler/src/lib.rs`); what actually decides whether a
table shows as reserved, whether the order follows the party, and whether a table is freed too
early is the `sql[]` chain of each command. So this harness runs those chains exactly as the
runtime does (`execute_tx_gated`): all statements of a command in ONE transaction, with the
runtime-injected params bound (`:hub_id`, `:current_user_id`, `:now`, `:new_id`), and any
missing `:param` bound as NULL. A failing `tables__gate` CHECK aborts the transaction, just
like in production.

Contract under test — the three defects of ERPlora/tables#12:

  1. RESERVATION → FLOOR PLAN. A confirmed reservation holds its table: the plan paints it
     `reserved` and says for whom/until when (the legend was unreachable because nothing ever
     wrote that status). The hold must be idempotent (the relay redelivers), must NOT stop the
     host from seating the party, and must expire by itself (a no-show cannot lock a table
     forever).

  2. TRANSFER RE-POINTS THE ORDER. After moving a party, exactly ONE live session owns the
     order, and it is the one on the destination table. The old bug left the order on both
     sessions, so finishing the order freed the table the party had LEFT — wiping out whoever
     was sitting there by then.

  3. SPLIT AND MERGE KEEP THE CHECK. Splitting opens a second check on the same table without
     losing the first one's order, and the table is not freed while a sibling check is still
     open. Merging re-points the order for real instead of leaving it on the table that was
     just emptied.

Usage: tests/floor.postgres.test.py
  Uses the `erplora-test-pg-5433` container by default (override: TABLES_TEST_PG_CONTAINER).
  Creates a scratch database and DROPS it at the end, pass or fail.
"""

import json
import os
import pathlib
import re
import subprocess
import sys
import uuid

MODULE_DIR = pathlib.Path(__file__).resolve().parent.parent
CONTAINER = os.environ.get("TABLES_TEST_PG_CONTAINER", "erplora-test-pg-5433")
DB = f"tables_floor_test_{os.getpid()}"
HUB = "hub-test"
USER = "u-waiter"

MANIFEST = json.loads((MODULE_DIR / "module.json").read_text())

failures: list[str] = []


# ── Postgres plumbing ────────────────────────────────────────────────────────────────────


def psql(args: list[str], db: str | None = None, stdin: str | None = None) -> str:
    cmd = [
        "docker",
        "exec",
        "-i",
        CONTAINER,
        "psql",
        "-v",
        "ON_ERROR_STOP=1",
        "-U",
        "postgres",
    ]
    if db:
        cmd += ["-d", db]
    cmd += args
    res = subprocess.run(cmd, input=stdin, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(res.stderr.strip() or res.stdout.strip())
    return res.stdout


def q(sql: str) -> str:
    """Scalar query against the scratch DB. A missing relation/column is a RED result, not a
    crash: the run must report every acceptance point, not stop at the first one."""
    try:
        return psql(["-tAc", sql], db=DB).strip()
    except RuntimeError as exc:
        return f"<sql error: {str(exc).splitlines()[0]}>"


# ── The runtime, in miniature ────────────────────────────────────────────────────────────

PARAM = re.compile(r":([a-z_][a-z0-9_]*)", re.IGNORECASE)


def literal(value) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def bind(sql: str, params: dict) -> str:
    """Single pass over `:name` placeholders — a value that itself contains a colon
    (an ISO timestamp) must never be rescanned. Params absent from the payload bind as
    NULL, which is what the runtime's driver does (`DynNull`, crates/db/src/lib.rs)."""
    return PARAM.sub(lambda m: literal(params.get(m.group(1))), sql)


# The outbox, in miniature. The runtime writes ONE row per `emit` INSIDE the command's
# transaction (`outbox::insert_op`), so a rollback takes the event with it. Modelling it here is
# what lets a test prove the half of tables#54 that hurts other modules: not "the answer lied", but
# "a `tables.session.parked` that never happened reached the bus and woke up the automations".
OUTBOX_DDL = """
CREATE TABLE IF NOT EXISTS test_event_outbox (
    id     BIGSERIAL PRIMARY KEY,
    event  TEXT NOT NULL,
    hub_id TEXT NOT NULL,
    at     TEXT NOT NULL
);
"""

# psql prints one command tag per statement (`UPDATE 3`, `INSERT 0 1`). That is the harness's
# `sql_counts` — what `execute_tx_gated` sums to decide the `expect_rows` gate.
TAG = re.compile(r"(?:INSERT \d+|UPDATE|DELETE|MERGE) (\d+)")


class DomainError(Exception):
    """What the runtime answers when a command's `expect_rows` gate rejects (hub#139): the whole
    transaction rolls back — no row, NO EVENT — and the module's own namespaced code surfaces
    instead of a `200 ok` with zero rows."""

    def __init__(self, code: str, affected: int):
        super().__init__(f"{code} (affected rows: {affected})")
        self.code = code
        self.affected = affected


def outbox_count(event: str) -> int:
    """Rows the miniature outbox holds for an event — 0 means the event never reached the bus."""
    return int(q(f"SELECT count(*) FROM test_event_outbox WHERE event = '{event}'") or 0)


_outbox_ready: set[str] = set()


def ensure_outbox() -> None:
    """The miniature outbox lives in whatever scratch DB the caller pointed the harness at
    (`harness.DB`), and every test file brings its own — so it is created on first use instead of
    at one fixed setup point."""
    if DB not in _outbox_ready:
        psql([], db=DB, stdin=OUTBOX_DDL)
        _outbox_ready.add(DB)


def _script_for(name: str, payload: dict, now: str) -> tuple[list[str], int, dict]:
    """The ops of a command in runtime order: its `sql[]` first, then one outbox INSERT per
    `emit`. Returns (statements, number-of-sql-ops, command-def)."""
    cmd = MANIFEST["commands"][name]
    params = dict(payload)
    params.setdefault("hub_id", HUB)
    params.setdefault("current_user_id", USER)
    params.setdefault("now", now)
    params.setdefault("new_id", str(uuid.uuid4()))

    stmts: list[str] = []
    for rel in cmd["sql"]:
        # A fresh :new_id per statement, like the runtime does per operation.
        stmt_params = dict(params)
        stmt_params["new_id"] = str(uuid.uuid4())
        stmts.append(bind((MODULE_DIR / rel).read_text(), stmt_params))
    sql_op_count = len(stmts)
    for event in cmd.get("emit", []):
        stmts.append(
            f"INSERT INTO test_event_outbox (event, hub_id, at) "
            f"VALUES ({literal(event)}, {literal(params['hub_id'])}, {literal(now)});"
        )
    return stmts, sql_op_count, cmd


def run_command(name: str, payload: dict, now: str) -> tuple[bool, str]:
    """Execute a manifest command's `sql[]` the way the runtime does: one transaction, system
    params injected, one outbox row per `emit`, and — when the command declares `expect_rows` —
    the gate applied on the SUM of the rows its `sql[]` affected (`execute_tx_gated`, hub#139).
    Below `n` the transaction rolls back entirely and `DomainError` is raised. Returns (ok, error);
    a gate CHECK violation → (False, msg)."""
    cmd = MANIFEST["commands"].get(name)
    if cmd is None:
        return False, f"command `{name}` is not declared in module.json"
    if not cmd.get("sql"):
        return (
            False,
            f"command `{name}` declares no sql[] (handler `{cmd.get('handler')}`)",
        )
    for rel in cmd["sql"]:
        if not (MODULE_DIR / rel).exists():
            return False, f"`{name}` declares `{rel}`, which does not exist"

    ensure_outbox()
    gate = cmd.get("expect_rows")
    if gate is not None:
        # Decide INSIDE the transaction, like `execute_tx_gated`: count first, then commit or
        # roll back. A dry run + rollback is the closest a psql script can get (it cannot branch
        # mid-stream), and it leaves nothing behind either way.
        stmts, sql_op_count, _ = _script_for(name, payload, now)
        try:
            out = psql([], db=DB, stdin="\n".join(["BEGIN;"] + stmts + ["ROLLBACK;"]))
        except RuntimeError as exc:
            psql(["-c", "DELETE FROM tables__gate"], db=DB)
            return False, str(exc)
        affected = sum(
            int(m.group(1))
            for line in out.splitlines()[:sql_op_count + 1]
            for m in [TAG.fullmatch(line.strip())]
            if m
        )
        if gate.get("op", "min") == "min" and affected < int(gate["n"]):
            raise DomainError(gate["error"], affected)

    stmts, _, _ = _script_for(name, payload, now)
    try:
        psql([], db=DB, stdin="\n".join(["BEGIN;"] + stmts + ["COMMIT;"]))
        return True, ""
    except RuntimeError as exc:
        psql(["-c", "DELETE FROM tables__gate"], db=DB)
        return False, str(exc)


def run_query(name: str, params: dict) -> list[dict]:
    """Execute a manifest query (base SELECT, no list wrapper) and return rows as dicts."""
    qdef = MANIFEST["queries"][name]
    sql = (MODULE_DIR / qdef["sql"]).read_text().strip().rstrip(";")
    p = dict(params)
    p.setdefault("hub_id", HUB)
    try:
        out = psql(["-tAc", f"SELECT row_to_json(r) FROM ({bind(sql, p)}) r"], db=DB)
    except RuntimeError:
        return []
    return [json.loads(line) for line in out.splitlines() if line.strip()]


# ── Assertions ───────────────────────────────────────────────────────────────────────────


def check(label: str, expected, actual):
    if expected != actual:
        failures.append(f"{label} — expected [{expected}], got [{actual}]")
        print(f"  FAIL: {label} — expected [{expected}], got [{actual}]")
    else:
        print(f"  ok: {label} = {expected}")


def command_ok(label: str, name: str, payload: dict, now: str):
    ok, err = run_command(name, payload, now)
    if not ok:
        failures.append(
            f"{label} — {name} failed: {err.splitlines()[-1] if err else ''}"
        )
        print(
            f"  FAIL: {label} — `{name}` failed: {err.splitlines()[-1] if err else ''}"
        )
    else:
        print(f"  ok: {label}")
    return ok


# ── Fixtures ─────────────────────────────────────────────────────────────────────────────


def seed_floor():
    """One zone and four tables — the smallest dining room that can host the whole day."""
    psql(
        [
            "-c",
            (
                f"INSERT INTO tables_zone (id, hub_id, name, description, color, sort_order, "
                f"is_active, is_deleted, created_at) VALUES "
                f"('z1', '{HUB}', 'Dining room', '', 'primary', 1, 1, 0, '2026-08-07T09:00:00+00:00')"
            ),
        ],
        db=DB,
    )
    for tid, number in [("t1", "1"), ("t2", "2"), ("t5", "5"), ("t8", "8")]:
        psql(
            [
                "-c",
                (
                    f"INSERT INTO tables_table (id, hub_id, zone_id, number, name, capacity, shape, "
                    f"status, is_active, position_x, position_y, width, height, is_deleted, created_at) "
                    f"VALUES ('{tid}', '{HUB}', 'z1', '{number}', '', 4, 'square', 'available', 1, "
                    f"0, 0, 10, 10, 0, '2026-08-07T09:00:00+00:00')"
                ),
            ],
            db=DB,
        )


def table_status(tid: str) -> str:
    return q(f"SELECT status FROM tables_table WHERE id = '{tid}' AND hub_id = '{HUB}'")


def session_status(sid: str) -> str:
    return q(
        f"SELECT status FROM tables_session WHERE id = '{sid}' AND hub_id = '{HUB}'"
    )


def live_sessions_for_order(order_id: str) -> list[str]:
    rows = q(
        f"SELECT id FROM tables_session WHERE hub_id = '{HUB}' AND order_id = '{order_id}' "
        f"AND status = 'active' AND is_deleted = 0 ORDER BY id"
    )
    return [r for r in rows.splitlines() if r.strip()]


def sessions_holding_order(order_id: str) -> int:
    return int(
        q(
            f"SELECT count(*) FROM tables_session WHERE hub_id = '{HUB}' "
            f"AND order_id = '{order_id}' AND is_deleted = 0"
        )
    )


# ── 1. A confirmed reservation marks the table on the floor plan ─────────────────────────


def test_reservation_marks_the_table():
    print("\n== 1. the confirmed reservation marks its table on the floor plan ==")

    # The host confirms Ana's 21:00 reservation for table 1. `reservations` owns the booking;
    # `tables` stays the AUTHORITY of occupancy, so it is `tables` that holds the table.
    hold = {
        "table_id": "t1",
        "source": "reservations",
        "source_ref": "r-ana",
        "held_from": "2026-08-07T21:00:00+00:00",
        "held_until": "2026-08-07T23:00:00+00:00",
        "party_size": 4,
        "label": "Ana",
    }
    command_ok(
        "holding the table for the reservation",
        "tables.tables.hold",
        hold,
        "2026-08-07T20:00:00+00:00",
    )
    check("the plan paints table 1 reserved", "reserved", table_status("t1"))

    # The floor plan must be able to SAY for whom — a bare colour is not a reservation.
    rows = [r for r in run_query("tables.tables.list", {}) if r["id"] == "t1"]
    check(
        "the plan knows the guest", "Ana", rows[0].get("reserved_for") if rows else None
    )
    check(
        "the plan knows until when",
        "2026-08-07T23:00:00+00:00",
        rows[0].get("reserved_until") if rows else None,
    )

    # The outbox is at-least-once: the same confirmation arrives twice.
    command_ok(
        "re-delivered confirmation",
        "tables.tables.hold",
        hold,
        "2026-08-07T20:05:00+00:00",
    )
    check(
        "the redelivery does not duplicate the hold",
        "1",
        q(
            f"SELECT count(*) FROM tables_table_hold WHERE hub_id = '{HUB}' "
            f"AND source = 'reservations' AND source_ref = 'r-ana' AND is_deleted = 0"
        ),
    )

    # THE regression that a naive fix introduces: painting a table `reserved` must not stop
    # the host from seating it — the whole point of the reservation is that Ana sits down.
    command_ok(
        "seating the reserved party",
        "tables._session_open",
        {
            "session_id": "s-ana",
            "table_id": "t1",
            "guests_count": 4,
            "waiter_id": None,
            "notes": "",
            "order_id": None,
        },
        "2026-08-07T21:03:00+00:00",
    )
    check("table 1 is occupied by the party", "occupied", table_status("t1"))
    check(
        "the hold is consumed, not left dangling",
        "consumed",
        q(
            f"SELECT status FROM tables_table_hold WHERE hub_id = '{HUB}' AND source_ref = 'r-ana'"
        ),
    )

    # A cancelled booking gives the table back.
    command_ok(
        "holding table 2 for a second booking",
        "tables.tables.hold",
        {
            "table_id": "t2",
            "source": "reservations",
            "source_ref": "r-luis",
            "held_from": "2026-08-07T21:30:00+00:00",
            "held_until": "2026-08-07T23:30:00+00:00",
            "party_size": 2,
            "label": "Luis",
        },
        "2026-08-07T20:10:00+00:00",
    )
    check("table 2 is reserved", "reserved", table_status("t2"))
    command_ok(
        "the booking is cancelled",
        "tables.tables.release_hold",
        {"source": "reservations", "source_ref": "r-luis"},
        "2026-08-07T20:40:00+00:00",
    )
    check("table 2 is sellable again", "available", table_status("t2"))

    # A no-show cannot lock a table for the rest of the night.
    command_ok(
        "holding table 2 for a no-show",
        "tables.tables.hold",
        {
            "table_id": "t2",
            "source": "reservations",
            "source_ref": "r-noshow",
            "held_from": "2026-08-07T21:30:00+00:00",
            "held_until": "2026-08-07T22:00:00+00:00",
            "party_size": 2,
            "label": "Nadie",
        },
        "2026-08-07T20:45:00+00:00",
    )
    check("table 2 is reserved again", "reserved", table_status("t2"))
    command_ok(
        "the nightly sweep runs after the window",
        "tables.tables.expire_holds",
        {},
        "2026-08-07T22:30:00+00:00",
    )
    check("the expired hold releases the table", "available", table_status("t2"))
    check(
        "the hold is recorded as expired",
        "expired",
        q(
            f"SELECT status FROM tables_table_hold WHERE hub_id = '{HUB}' AND source_ref = 'r-noshow'"
        ),
    )

    # Ana pays and leaves — the dining room goes back to its opening state for the next scene.
    command_ok(
        "Ana pays and leaves",
        "tables._session_close",
        {"session_id": "s-ana", "notes": None},
        "2026-08-07T22:45:00+00:00",
    )
    check("table 1 is sellable again", "available", table_status("t1"))


# ── 2. Transferring re-points the order for real ─────────────────────────────────────────


def test_transfer_repoints_the_order():
    print("\n== 2. transferring a party re-points its order ==")

    command_ok(
        "party sits at table 5 with order O1",
        "tables._session_open",
        {
            "session_id": "s5",
            "table_id": "t5",
            "guests_count": 2,
            "waiter_id": None,
            "notes": "",
            "order_id": "O1",
        },
        "2026-08-07T13:00:00+00:00",
    )
    command_ok(
        "the party moves to table 8",
        "tables._session_transfer",
        {"session_id": "s5", "target_table_id": "t8", "new_session_id": "s8"},
        "2026-08-07T13:20:00+00:00",
    )

    # THE defect: the order stayed on the old session too, so it pointed at two tables.
    check(
        "exactly one live session owns order O1", ["s8"], live_sessions_for_order("O1")
    )
    check("only one session row keeps O1 at all", 1, sessions_holding_order("O1"))
    check("table 8 is occupied", "occupied", table_status("t8"))
    check("table 5 is free for the next party", "available", table_status("t5"))

    # The consequence the QA saw: a new party takes the table the first one left…
    command_ok(
        "a new party takes table 5",
        "tables._session_open",
        {
            "session_id": "s5b",
            "table_id": "t5",
            "guests_count": 3,
            "waiter_id": None,
            "notes": "",
            "order_id": "O2",
        },
        "2026-08-07T13:25:00+00:00",
    )
    # …and the FIRST party pays. Their order must not empty table 5 underneath the new party.
    command_ok(
        "the moved party pays",
        "tables._session_close_by_order",
        {"order_id": "O1"},
        "2026-08-07T14:00:00+00:00",
    )
    check("table 8 is released by the payment", "available", table_status("t8"))
    check("table 5 keeps its new party", "occupied", table_status("t5"))
    check("the new party's session survives", "active", session_status("s5b"))

    command_ok(
        "the new party pays too",
        "tables._session_close_by_order",
        {"order_id": "O2"},
        "2026-08-07T14:30:00+00:00",
    )
    check("table 5 is free at last", "available", table_status("t5"))


# ── 3. Splitting and merging exist and keep the check ────────────────────────────────────


def test_split_and_merge_keep_the_check():
    print("\n== 3. splitting and merging a check ==")

    command_ok(
        "party sits at table 5 with order O3",
        "tables._session_open",
        {
            "session_id": "s-split-a",
            "table_id": "t5",
            "guests_count": 4,
            "waiter_id": None,
            "notes": "",
            "order_id": "O3",
        },
        "2026-08-07T15:00:00+00:00",
    )

    # SPLIT — two of the four want their own bill. A second check opens on the SAME table.
    command_ok(
        "splitting the check",
        "tables._session_split",
        {
            "session_id": "s-split-a",
            "new_session_id": "s-split-b",
            "target_table_id": "t5",
            "guests_count": 2,
            "notes": "",
        },
        "2026-08-07T15:40:00+00:00",
    )
    check(
        "the first check keeps its order",
        "O3",
        q(
            f"SELECT order_id FROM tables_session WHERE id = 's-split-a' AND hub_id = '{HUB}'"
        ),
    )
    check("the first check is still open", "active", session_status("s-split-a"))
    check("the second check is open", "active", session_status("s-split-b"))
    check(
        "the second check knows where it came from",
        "s-split-a",
        q(
            f"SELECT split_from_id FROM tables_session WHERE id = 's-split-b' AND hub_id = '{HUB}'"
        ),
    )
    check(
        "the second check is on the same table",
        "t5",
        q(
            f"SELECT table_id FROM tables_session WHERE id = 's-split-b' AND hub_id = '{HUB}'"
        ),
    )
    check(
        "the split is written to the history",
        "split",
        q(
            f"SELECT assignment_reason FROM tables_session_assignment WHERE hub_id = '{HUB}' "
            f"AND session_id = 's-split-b'"
        ),
    )

    # `sales` materialises the second order and links it to ITS check — not to the table's
    # first one, which is the ambiguity a second open session introduces.
    command_ok(
        "the POS links the second order",
        "tables.sessions.link_order",
        {"table_id": "t5", "session_id": "s-split-b", "order_id": "O4"},
        "2026-08-07T15:41:00+00:00",
    )
    check(
        "the second check owns O4",
        "O4",
        q(
            f"SELECT order_id FROM tables_session WHERE id = 's-split-b' AND hub_id = '{HUB}'"
        ),
    )
    check(
        "linking the second order did not steal the first one",
        "O3",
        q(
            f"SELECT order_id FROM tables_session WHERE id = 's-split-a' AND hub_id = '{HUB}'"
        ),
    )

    # Paying one check must NOT empty the table while the other is still eating.
    command_ok(
        "the first half pays",
        "tables._session_close_by_order",
        {"order_id": "O3"},
        "2026-08-07T16:00:00+00:00",
    )
    check(
        "table 5 stays occupied while a check is open", "occupied", table_status("t5")
    )
    command_ok(
        "the second half pays",
        "tables._session_close_by_order",
        {"order_id": "O4"},
        "2026-08-07T16:10:00+00:00",
    )
    check("table 5 is free once every check is paid", "available", table_status("t5"))

    # MERGE — two tables become one. The order must follow, not stay on the emptied table.
    command_ok(
        "party A sits at table 1",
        "tables._session_open",
        {
            "session_id": "s-m-a",
            "table_id": "t1",
            "guests_count": 2,
            "waiter_id": None,
            "notes": "",
            "order_id": "O5",
        },
        "2026-08-07T17:00:00+00:00",
    )
    command_ok(
        "party B sits at table 2 without ordering yet",
        "tables._session_open",
        {
            "session_id": "s-m-b",
            "table_id": "t2",
            "guests_count": 2,
            "waiter_id": None,
            "notes": "",
            "order_id": None,
        },
        "2026-08-07T17:05:00+00:00",
    )
    command_ok(
        "table 1 is merged into table 2",
        "tables._session_merge",
        {"session_id": "s-m-a", "target_table_id": "t2"},
        "2026-08-07T17:10:00+00:00",
    )

    check(
        "the surviving check took over the order",
        "O5",
        q(
            f"SELECT order_id FROM tables_session WHERE id = 's-m-b' AND hub_id = '{HUB}'"
        ),
    )
    check("exactly one live session owns O5", ["s-m-b"], live_sessions_for_order("O5"))
    check("only one session row keeps O5 at all", 1, sessions_holding_order("O5"))
    check("table 1 is emptied by the merge", "available", table_status("t1"))
    check("table 2 holds the joined party", "occupied", table_status("t2"))

    command_ok(
        "the joined party pays",
        "tables._session_close_by_order",
        {"order_id": "O5"},
        "2026-08-07T18:00:00+00:00",
    )
    check("table 2 is released", "available", table_status("t2"))
    check("table 1 was not disturbed", "available", table_status("t1"))


# ── Runner ───────────────────────────────────────────────────────────────────────────────


# ── 4. Covers: asked when the party sits, visible on the plan, correctable while open ──────


def test_guests_count_is_visible_and_correctable():
    """tables#32 — `guests_count` existed end to end but no UI asked for it, so every table sat
    "1 pax" in silence. The plan needs the LIVE party size per table (not just the capacity),
    and the waiter must be able to correct it while the check is open (a fifth guest arrives)."""
    print("\n== 4. covers are read on the plan and correctable while the check is open ==")

    command_ok(
        "a party of 3 sits at table 1",
        "tables._session_open",
        {
            "session_id": "s1g",
            "table_id": "t1",
            "guests_count": 3,
            "waiter_id": None,
            "notes": "",
            "order_id": None,
        },
        "2026-08-07T20:00:00+00:00",
    )
    rows = {r["id"]: r for r in run_query("tables.tables.list", {})}
    check("the plan projects the live covers of table 1", 3, rows.get("t1", {}).get("live_guests"))
    check("a free table has no live covers", None, rows.get("t2", {}).get("live_guests"))

    command_ok(
        "a fifth guest arrives: covers corrected to 5 while the check is open",
        "tables.sessions.set_guests",
        {"session_id": "s1g", "guests_count": 5},
        "2026-08-07T20:10:00+00:00",
    )
    check(
        "the session carries the corrected covers",
        "5",
        q(f"SELECT guests_count FROM tables_session WHERE id = 's1g' AND hub_id = '{HUB}'"),
    )
    rows = {r["id"]: r for r in run_query("tables.tables.list", {})}
    check("and the plan reflects it", 5, rows.get("t1", {}).get("live_guests"))

    command_ok(
        "the party pays",
        "tables._session_close",
        {"session_id": "s1g", "notes": None},
        "2026-08-07T21:00:00+00:00",
    )
    # tables#54: correcting a closed check is not a silent no-op any more — it is refused with the
    # module's own code, so the POS can say WHY instead of showing a save that did not happen.
    try:
        run_command(
            "tables.sessions.set_guests",
            {"session_id": "s1g", "guests_count": 2},
            "2026-08-07T21:05:00+00:00",
        )
        check("correcting a CLOSED check is refused", "tables.session_not_active", "ok:true")
    except DomainError as exc:
        check("correcting a CLOSED check is refused", "tables.session_not_active", exc.code)
    check(
        "a closed check keeps its covers (the update touches ACTIVE sessions only)",
        "5",
        q(f"SELECT guests_count FROM tables_session WHERE id = 's1g' AND hub_id = '{HUB}'"),
    )


def main() -> int:
    running = subprocess.run(
        ["docker", "inspect", "-f", "{{.State.Running}}", CONTAINER],
        capture_output=True,
        text=True,
    )
    if "true" not in running.stdout:
        subprocess.run(["docker", "start", CONTAINER], capture_output=True)

    psql(["-c", f"DROP DATABASE IF EXISTS {DB} WITH (FORCE)"])
    psql(["-c", f"CREATE DATABASE {DB}"])
    try:
        for mig in sorted((MODULE_DIR / "migrations" / "postgres").glob("*.sql")):
            psql([], db=DB, stdin=mig.read_text())
        seed_floor()

        test_reservation_marks_the_table()
        test_transfer_repoints_the_order()
        test_split_and_merge_keep_the_check()
        test_guests_count_is_visible_and_correctable()
    finally:
        psql(["-c", f"DROP DATABASE IF EXISTS {DB} WITH (FORCE)"])

    print()
    if failures:
        print(f"FAILED — {len(failures)} assertion(s):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("PASS — the floor survives a full service (tables#12)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
