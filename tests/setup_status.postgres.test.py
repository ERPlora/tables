#!/usr/bin/env python3
"""Setup-check contract test (tables#24) — runs against a REAL Postgres 18 in Docker.

What `hub.setup.status` asks this module is one question: **does the floor plan have at least one
usable table?** Until it does, there is no table service — no order per table, no split, no merge,
no transfer. Everything this module exists for starts at the first table, so that is the line
between "installed" and "configured".

Why the check runs against a real database instead of being asserted on the manifest: the answer
is produced by SQL, and every way of getting it wrong is a SQL-semantics mistake — counting rows
another tenant owns, counting rows the user deleted, counting a table that was switched off, or
returning zero rows on an empty floor when the contract says ONE. The runtime is forgiving with a
check it cannot make (`setup-status.md` §5: a failing check omits the item rather than reporting a
false pending), so none of those mistakes would go red on a hub — the floor plan would simply
never appear in the checklist, or worse, appear ticked. This harness is where they have to go red.

The contract under test:

  1. ONE ROW, ALWAYS. `hub.setup.status` reads `rows.first()`. The query is an aggregate with no
     GROUP BY, so an empty floor answers `0` instead of answering nothing — the checklist can tell
     "not configured yet" from "the check could not run", which are different facts.

  2. AN EMPTY FLOOR IS NOT CONFIGURED, ONE TABLE IS. Evaluated through the same `configured_when`
     the runtime evaluates, mirrored below, so what is under test is the declared contract and not
     just the SELECT.

  3. USABLE MEANS USABLE. A soft-deleted table is gone, and an inactive one cannot be sat at, so
     neither counts. Occupancy is the opposite: a full dining room is the most configured a floor
     plan ever is — a check that read `status` would flip the checklist back to "pending" in the
     middle of service.

  4. THE TENANT BOUNDARY. Another hub's dining room must never tick this hub's item.

Usage: tests/setup_status.postgres.test.py
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
DB = f"tables_setup_test_{os.getpid()}"
HUB = "hub-test"
OTHER_HUB = "hub-next-door"
USER = "u-manager"

MANIFEST = json.loads((MODULE_DIR / "module.json").read_text())

failures: list[str] = []


# ── Postgres plumbing (same shape as tests/floor.postgres.test.py) ───────────────────────


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
    """Single pass over `:name` placeholders; anything the payload does not carry binds as NULL,
    which is what the runtime's driver does."""
    return PARAM.sub(lambda m: literal(params.get(m.group(1))), sql)


def run_command(name: str, payload: dict, now: str, hub: str = HUB) -> tuple[bool, str]:
    """Run a manifest command's `sql[]` the way the runtime does: one transaction, system params
    injected. Used so the fixtures are built by the REAL command, not by hand-written INSERTs
    that could drift from it."""
    cmd = MANIFEST["commands"].get(name)
    if cmd is None:
        return False, f"command `{name}` is not declared in module.json"
    files = cmd.get("sql")
    if not files:
        return False, f"command `{name}` declares no sql[]"

    params = dict(payload)
    params.setdefault("hub_id", hub)
    params.setdefault("current_user_id", USER)
    params.setdefault("now", now)

    script = ["BEGIN;"]
    for rel in files:
        path = MODULE_DIR / rel
        if not path.exists():
            return False, f"`{name}` declares `{rel}`, which does not exist"
        stmt_params = dict(params)
        stmt_params.setdefault("new_id", str(uuid.uuid4()))
        script.append(bind(path.read_text(), stmt_params))
    script.append("COMMIT;")

    try:
        psql([], db=DB, stdin="\n".join(script))
        return True, ""
    except RuntimeError as exc:
        return False, str(exc)


def run_query(name: str, params: dict, hub: str = HUB) -> list[dict] | str:
    """Run a manifest query and return its rows. A missing declaration or broken SQL comes back as
    a string so the run reports every acceptance point instead of stopping at the first."""
    qdef = (MANIFEST.get("queries") or {}).get(name)
    if qdef is None:
        return f"<query `{name}` is not declared in module.json>"
    path = MODULE_DIR / qdef["sql"]
    if not path.exists():
        return f"<`{name}` declares `{qdef['sql']}`, which does not exist>"
    p = dict(params)
    p.setdefault("hub_id", hub)
    sql = path.read_text().strip().rstrip(";")
    try:
        out = psql(["-tAc", f"SELECT row_to_json(r) FROM ({bind(sql, p)}) r"], db=DB)
    except RuntimeError as exc:
        return f"<sql error: {str(exc).splitlines()[0]}>"
    return [json.loads(line) for line in out.splitlines() if line.strip()]


# ── The runtime's evaluator, in miniature ────────────────────────────────────────────────
#
# Mirrors `truthy` / `passes` / `is_configured` in hub/crates/runtime/src/setup_status.rs. What is
# under test is the declared contract — query AND `configured_when` — not the SELECT on its own:
# a query that answers correctly under a `configured_when` that can never pass is still a module
# that never gets ticked.


def truthy(value) -> bool:
    if value is None or value is False:
        return False
    if value is True:
        return True
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        s = value.strip()
        return bool(s) and s != "0" and s.lower() != "false"
    if isinstance(value, (list, dict)):
        return bool(value)
    return True


def as_text(value) -> str:
    if isinstance(value, str):
        return value
    if value is None:
        return ""
    return json.dumps(value)


def passes(row: dict, check: dict) -> bool:
    value = row.get(check["field"])
    if "truthy" in check:
        return truthy(value) == check["truthy"]
    if "equals" in check:
        return as_text(value) == as_text(check["equals"])
    return False


def is_configured(rows) -> bool:
    """Configured ⇔ there is a row AND every declared check passes on it (ADR-0063)."""
    setup = MANIFEST.get("setup") or {}
    if not isinstance(rows, list) or not rows:
        return False
    return all(passes(rows[0], c) for c in setup.get("configured_when", []))


def setup_rows(hub: str = HUB):
    setup = MANIFEST.get("setup") or {}
    name = setup.get("query")
    if not name:
        return "<module.json declares no `setup.query`>"
    return run_query(name, dict(setup.get("params") or {}), hub=hub)


def row_count(rows) -> int | str:
    """Rows come back as a string when the query could not run; counting its characters would
    report a number that means nothing."""
    return len(rows) if isinstance(rows, list) else rows


# ── Assertions ───────────────────────────────────────────────────────────────────────────


def check(label: str, expected, actual):
    if expected != actual:
        failures.append(f"{label} — expected [{expected}], got [{actual}]")
        print(f"  FAIL: {label} — expected [{expected}], got [{actual}]")
    else:
        print(f"  ok: {label} = {expected}")


def command_ok(label: str, name: str, payload: dict, now: str, hub: str = HUB) -> bool:
    ok, err = run_command(name, payload, now, hub=hub)
    if not ok:
        tail = err.splitlines()[-1] if err else ""
        failures.append(f"{label} — `{name}` failed: {tail}")
        print(f"  FAIL: {label} — `{name}` failed: {tail}")
    else:
        print(f"  ok: {label}")
    return ok


def new_table(number: str, now: str, hub: str = HUB) -> str:
    """Create a table through the real command and return its id."""
    tid = str(uuid.uuid4())
    command_ok(
        f"table {number} is created",
        "tables.tables.create",
        {
            "new_id": tid,
            "zone_id": None,
            "number": number,
            "name": "",
            "capacity": 4,
            "position_x": 0,
            "position_y": 0,
            "width": 10,
            "height": 10,
            "shape": "square",
        },
        now,
        hub=hub,
    )
    return tid


# ── 1. One row, always — including on an empty floor ─────────────────────────────────────


def test_the_check_always_answers_exactly_one_row():
    print("\n== 1. the check answers exactly one row, empty floor included ==")

    rows = setup_rows()
    if isinstance(rows, str):
        failures.append(f"the setup check does not run: {rows}")
        print(f"  FAIL: the setup check does not run: {rows}")
        return

    # Zero rows would ALSO read as "not configured" (ADR-0063), so this is not about the verdict:
    # it is about being able to tell a real "nothing yet" from a check that never ran. The runtime
    # omits an item whose check failed, so those two must not look alike.
    check("an empty floor still answers one row", 1, row_count(rows))

    setup = MANIFEST.get("setup") or {}
    for c in setup.get("configured_when", []):
        field = c.get("field")
        check(
            f"the row carries the `{field}` the contract evaluates",
            True,
            field in rows[0],
        )

    check("an empty floor plan is not configured", False, is_configured(rows))


# ── 2. The first usable table is what configures the module ──────────────────────────────


def test_one_table_configures_the_module():
    print("\n== 2. the first table configures the floor plan ==")

    tid = new_table("1", "2026-08-07T09:00:00+00:00")
    check("one table configures the module", True, is_configured(setup_rows()))
    check("still exactly one row", 1, row_count(setup_rows()))

    # Deleting the last table undoes it: the checklist is state, not a milestone that was reached
    # once. A user who empties the floor plan has work to do again.
    psql(
        [
            "-c",
            f"UPDATE tables_table SET is_deleted = 1, deleted_at = '2026-08-07T10:00:00+00:00' "
            f"WHERE id = '{tid}' AND hub_id = '{HUB}'",
        ],
        db=DB,
    )
    check("a deleted table does not count", False, is_configured(setup_rows()))

    # Switched off is not usable either: an inactive table is off the floor plan, so nobody can be
    # seated at it. Counting it would tick the item for a dining room with nowhere to sit.
    tid2 = new_table("2", "2026-08-07T10:05:00+00:00")
    psql(
        [
            "-c",
            f"UPDATE tables_table SET is_active = 0 WHERE id = '{tid2}' AND hub_id = '{HUB}'",
        ],
        db=DB,
    )
    check("an inactive table does not count", False, is_configured(setup_rows()))

    psql(
        [
            "-c",
            f"UPDATE tables_table SET is_active = 1 WHERE id = '{tid2}' AND hub_id = '{HUB}'",
        ],
        db=DB,
    )
    check("switching it back on configures it again", True, is_configured(setup_rows()))


# ── 3. A busy dining room is still a configured one ──────────────────────────────────────


def test_occupancy_never_unconfigures_the_floor():
    print("\n== 3. service does not un-configure the floor plan ==")

    # THE regression a status-aware check would introduce: the item would go back to "pending"
    # every time the restaurant fills up, which is the one moment it is most obviously done.
    for status in ("occupied", "reserved", "blocked"):
        psql(
            [
                "-c",
                f"UPDATE tables_table SET status = '{status}' WHERE hub_id = '{HUB}'",
            ],
            db=DB,
        )
        check(
            f"a floor where every table is `{status}` stays configured",
            True,
            is_configured(setup_rows()),
        )
    psql(
        ["-c", f"UPDATE tables_table SET status = 'available' WHERE hub_id = '{HUB}'"],
        db=DB,
    )


# ── 4. The tenant boundary ───────────────────────────────────────────────────────────────


def test_another_hub_never_configures_this_one():
    print("\n== 4. the neighbour's dining room is not ours ==")

    new_table("101", "2026-08-07T11:00:00+00:00", hub=OTHER_HUB)
    psql(
        [
            "-c",
            f"UPDATE tables_table SET is_deleted = 1 WHERE hub_id = '{HUB}'",
        ],
        db=DB,
    )
    check("our floor is empty again", False, is_configured(setup_rows()))
    check(
        "the neighbour's floor is configured",
        True,
        is_configured(setup_rows(hub=OTHER_HUB)),
    )


# ── Runner ───────────────────────────────────────────────────────────────────────────────


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

        test_the_check_always_answers_exactly_one_row()
        test_one_table_configures_the_module()
        test_occupancy_never_unconfigures_the_floor()
        test_another_hub_never_configures_this_one()
    finally:
        psql(["-c", f"DROP DATABASE IF EXISTS {DB} WITH (FORCE)"])

    print()
    if failures:
        print(f"FAILED — {len(failures)} assertion(s):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("PASS — the setup check answers for the floor plan (tables#24)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
