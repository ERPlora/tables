#!/usr/bin/env python3
"""Assignment-history invariants (`tables_session_assignment`) — ported from the hub's
`tables_session_history_e2e.rs` stage 1 (ERPlora/hub#1264, contract «El Hub se CIERRA como
KERNEL» §5: the module proves its own schema; the hub keeps only the conformance of its fixture).

ADR-0146 — the service session is the source of truth of the floor. `tables_session.table_id`
only knows WHERE an account is NOW: moving from table 12 to table 8 overwrites it and the stop at
12 disappears — exactly what is needed to know how long each table stayed occupied. The history is
append-only: each segment opens with its own reason and closes with its own
(`assignment_reason` / `release_reason`), so parking only CLOSES the live segment instead of
inventing a row for the parked period.

Why a SQL-level test and not a `.hub.test.py` one: nothing in `module.json` exposes this table
through a query — it is internal bookkeeping the module's own reports read directly — and every
promise below is a Postgres CHECK, a unique index or a migration's backfill, never a command's
business decision. That is exactly what `floor.postgres.test.py`'s miniature runtime already
proves for `tables#12`, so this battery reuses it instead of inventing a second one.

Six invariants of `005_session_assignment.sql`:

  1. The table exists and takes one open segment.
  2. A session cannot hold two LIVE segments at once — the unique partial index
     (`released_at IS NULL`) is what makes "move" mean close-then-open instead of two tables
     occupied by the same account, which is the exact defect the ADR describes.
  3. The SAME `operation_id` never writes a second segment — the relay may redeliver and the
     waiter may tap twice.
  4. A reason outside the closed vocabulary is refused by the CHECK — the reason is DERIVED by
     the command that ran, never typed by a screen.
  5. The migration's backfill gives history to sessions that already existed when it ran, and
     re-running it does not duplicate (idempotent by `WHERE NOT EXISTS`).
  6. Postgres dropped the inherited `ON DELETE CASCADE` (`007_session_history_fk.sql`, tables#21):
     deleting a session does not take its history with it.

Usage: tests/session_history.postgres.test.py
  Uses the `erplora-test-pg-5433` container by default (override: TABLES_TEST_PG_CONTAINER).
  Creates a scratch database and DROPS it at the end, pass or fail.
"""

import importlib.util
import pathlib
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location(
    "floor_harness", HERE / "floor.postgres.test.py"
)
harness = importlib.util.module_from_spec(_spec)
assert _spec.loader is not None
_spec.loader.exec_module(harness)

harness.DB = f"tables_session_history_test_{harness.os.getpid()}"
DB = harness.DB
HUB = harness.HUB
MODULE_DIR = harness.MODULE_DIR
psql = harness.psql
q = harness.q
check = harness.check
failures = harness.failures


def check_true(label: str, condition: bool, detail: str = "") -> None:
    if not condition:
        failures.append(f"{label} — {detail}" if detail else label)
        print(f"  FAIL: {label} {detail}")
    else:
        print(f"  ok: {label}")


def count(sql: str) -> int:
    return int(q(sql) or 0)


def seed_tables() -> None:
    for tid, number in (("m12", "12"), ("m8", "8")):
        psql(
            [
                "-c",
                (
                    f"INSERT INTO tables_table (id, hub_id, number, name, capacity, is_deleted, "
                    f"created_at) VALUES ('{tid}', '{HUB}', '{number}', 'Mesa {number}', 4, 0, "
                    f"'2026-07-19T00:00:00+00:00')"
                ),
            ],
            db=DB,
        )


def legacy_session(
    sid: str, table_id: str, opened_at: str, closed_at: str | None = None
) -> None:
    """A session as it existed BEFORE this history table did — the shape every hub already carries
    when this migration runs on it."""
    status = "closed" if closed_at else "active"
    closed_sql = f"'{closed_at}'" if closed_at else "NULL"
    psql(
        [
            "-c",
            (
                f"INSERT INTO tables_session (id, hub_id, table_id, opened_at, closed_at, "
                f"guests_count, status, notes, is_deleted, created_at) VALUES "
                f"('{sid}', '{HUB}', '{table_id}', '{opened_at}', {closed_sql}, 2, '{status}', "
                f"'', 0, '{opened_at}')"
            ),
        ],
        db=DB,
    )


def assignment(
    aid: str,
    session_id: str,
    table_id: str,
    operation_id: str,
    reason: str = "opened",
    released_at: str | None = None,
    release_reason: str = "",
) -> tuple[bool, str]:
    """One raw INSERT into `tables_session_assignment` — the CHECK constraints and unique indexes
    decide, exactly like a command's `sql[]` would in production."""
    released_sql = f"'{released_at}'" if released_at else "NULL"
    reason_out = release_reason if released_at else ""
    try:
        psql(
            [
                "-c",
                (
                    "INSERT INTO tables_session_assignment (id, hub_id, session_id, table_id, "
                    "assigned_at, released_at, assignment_reason, release_reason, operation_id, "
                    f"is_deleted, created_at) VALUES ('{aid}', '{HUB}', '{session_id}', "
                    f"'{table_id}', '2026-07-19T20:00:00+00:00', {released_sql}, '{reason}', "
                    f"'{reason_out}', '{operation_id}', 0, '2026-07-19T20:00:00+00:00')"
                ),
            ],
            db=DB,
        )
        return True, ""
    except RuntimeError as exc:
        return False, str(exc)


def release(aid: str, released_at: str, reason: str) -> None:
    psql(
        [
            "-c",
            (
                f"UPDATE tables_session_assignment SET released_at = '{released_at}', "
                f"release_reason = '{reason}' WHERE id = '{aid}' AND hub_id = '{HUB}'"
            ),
        ],
        db=DB,
    )


def test_the_table_exists_and_takes_one_open_segment() -> None:
    print("\n1 · the history table exists and admits one open segment")
    legacy_session("s1", "m12", "2026-07-19T20:00:00+00:00")
    ok, err = assignment("a1", "s1", "m12", "op-1")
    check_true("a live segment writes clean", ok, err)
    check(
        "one row in the history",
        1,
        count(f"SELECT COUNT(*) FROM tables_session_assignment WHERE hub_id = '{HUB}'"),
    )


def test_a_session_cannot_hold_two_live_segments() -> None:
    print("\n2 · a session cannot hold two LIVE segments at once")
    # THIS is the invariant the ADR exists for: three tables occupied by the same account and none
    # of them ever freed. Moving means closing the segment that is open, never stacking a second.
    legacy_session("s2", "m12", "2026-07-19T20:00:00+00:00")
    ok, _ = assignment("a2a", "s2", "m12", "op-2a")
    check_true("the first segment enters", ok)

    ok, err = assignment("a2b", "s2", "m8", "op-2b")
    check_true("a second LIVE segment for the same session is refused", not ok, err)
    check_true(
        "…refused by the unique index, not a generic error",
        "uq_session_assignment_activa" in err,
        err,
    )

    # Closing the first one is exactly "moving": the second now enters clean.
    release("a2a", "2026-07-19T20:45:00+00:00", "moved")
    ok, err = assignment("a2b", "s2", "m8", "op-2b")
    check_true("after closing the first, the move enters", ok, err)
    check(
        "two segments total: the closed one and the new one",
        2,
        count(
            f"SELECT COUNT(*) FROM tables_session_assignment WHERE hub_id = '{HUB}' "
            f"AND session_id = 's2'"
        ),
    )


def test_the_same_operation_id_never_writes_twice() -> None:
    print(
        "\n3 · the same `operation_id` never writes a second segment (relay redelivery)"
    )
    legacy_session("s3", "m12", "2026-07-19T20:00:00+00:00")
    ok, err = assignment(
        "a3a",
        "s3",
        "m12",
        "op-3",
        released_at="2026-07-19T20:45:00+00:00",
        release_reason="moved",
    )
    check_true("the first write of the operation enters", ok, err)

    ok, err = assignment("a3b", "s3", "m8", "op-3")
    check_true(
        "the SAME operation_id writing a different segment is refused", not ok, err
    )
    check_true(
        "…refused by the operation's own unique index",
        "uq_session_assignment_operation" in err,
        err,
    )


def test_an_invented_reason_is_rejected() -> None:
    print("\n4 · a reason outside the closed vocabulary is rejected")
    legacy_session("s4", "m12", "2026-07-19T20:00:00+00:00")
    ok, err = assignment("a4", "s4", "m12", "op-4", reason="porque-si")
    check_true("a reason nobody declared is refused", not ok, err)
    check_true(
        "…the reason is a CLOSED vocabulary, never free text typed by a screen",
        "assignment_reason" in err and "check" in err.lower(),
        err,
    )


def test_the_backfill_gives_history_to_sessions_that_already_existed() -> None:
    print("\n5 · the migration's backfill gives history to sessions it never saw open")
    # By the time these two are inserted, migration 005 already ran (on an empty table) at CREATE
    # time — so they carry NO segment yet, exactly like a hub upgraded from before this table
    # existed.
    legacy_session("s-viva", "m12", "2026-07-19T20:00:00+00:00")
    legacy_session(
        "s-cerrada", "m8", "2026-07-19T18:00:00+00:00", "2026-07-19T19:30:00+00:00"
    )

    backfill_source = (
        MODULE_DIR / "migrations" / "postgres" / "005_session_assignment.sql"
    ).read_text()
    # Keep only the backfill INSERT: strip comments (they precede the statement, so leaving them
    # in means the chunk never "starts with INSERT") and every other DDL statement in the file.
    without_comments = "\n".join(
        line
        for line in backfill_source.splitlines()
        if not line.strip().startswith("--")
    )
    backfill = ";".join(
        stmt.strip()
        for stmt in without_comments.split(";")
        if stmt.strip().upper().startswith("INSERT")
    )
    check_true("the migration carries its backfill", bool(backfill))

    # Run it TWICE: a backfill that duplicates on reapply is worse than not having one.
    for _ in range(2):
        psql([], db=DB, stdin=backfill)

    check(
        "one row per session, and reapplying does not duplicate",
        2,
        count(
            f"SELECT COUNT(*) FROM tables_session_assignment WHERE hub_id = '{HUB}' "
            f"AND session_id IN ('s-viva', 's-cerrada')"
        ),
    )
    check(
        "the live session gets an OPEN segment",
        1,
        count(
            f"SELECT COUNT(*) FROM tables_session_assignment WHERE hub_id = '{HUB}' "
            f"AND session_id = 's-viva' AND released_at IS NULL AND assignment_reason = 'opened'"
        ),
    )
    check(
        "the closed session gets a segment closed at the moment it closed",
        1,
        count(
            f"SELECT COUNT(*) FROM tables_session_assignment WHERE hub_id = '{HUB}' "
            f"AND session_id = 's-cerrada' AND released_at = '2026-07-19T19:30:00+00:00' "
            f"AND release_reason = 'closed'"
        ),
    )


def test_deleting_a_session_does_not_cascade_its_history() -> None:
    print(
        "\n6 · Postgres dropped the inherited CASCADE (007): deleting a session keeps its history"
    )
    legacy_session("s5", "m12", "2026-07-19T20:00:00+00:00")
    assignment(
        "a5a",
        "s5",
        "m12",
        "op-5a",
        released_at="2026-07-19T20:30:00+00:00",
        release_reason="parked",
    )
    assignment("a5b", "s5", "m8", "op-5b", reason="restored")
    check(
        "two segments before the delete",
        2,
        count(
            f"SELECT COUNT(*) FROM tables_session_assignment WHERE hub_id = '{HUB}' "
            f"AND session_id = 's5'"
        ),
    )

    psql(
        ["-c", f"DELETE FROM tables_session WHERE id = 's5' AND hub_id = '{HUB}'"],
        db=DB,
    )

    check(
        "the history survives the delete",
        2,
        count(
            f"SELECT COUNT(*) FROM tables_session_assignment WHERE hub_id = '{HUB}' "
            f"AND session_id = 's5'"
        ),
    )


def main() -> int:
    running = subprocess.run(
        ["docker", "inspect", "-f", "{{.State.Running}}", harness.CONTAINER],
        capture_output=True,
        text=True,
    )
    if "true" not in running.stdout:
        subprocess.run(["docker", "start", harness.CONTAINER], capture_output=True)

    psql(["-c", f"DROP DATABASE IF EXISTS {DB} WITH (FORCE)"])
    psql(["-c", f"CREATE DATABASE {DB}"])
    try:
        for mig in sorted((MODULE_DIR / "migrations" / "postgres").glob("*.sql")):
            psql([], db=DB, stdin=mig.read_text())
        seed_tables()

        test_the_table_exists_and_takes_one_open_segment()
        test_a_session_cannot_hold_two_live_segments()
        test_the_same_operation_id_never_writes_twice()
        test_an_invented_reason_is_rejected()
        test_the_backfill_gives_history_to_sessions_that_already_existed()
        test_deleting_a_session_does_not_cascade_its_history()
    finally:
        psql(["-c", f"DROP DATABASE IF EXISTS {DB} WITH (FORCE)"])

    print()
    if failures:
        print(f"FAILED — {len(failures)} assertion(s):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("PASS — the assignment history keeps its invariants (ADR-0146, hub#1264)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
