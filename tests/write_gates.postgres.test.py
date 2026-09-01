#!/usr/bin/env python3
"""Write gates of the SQL commands (tables#54) — runs against a REAL Postgres 18 in Docker.

Every SQL command of this module carries its precondition in the `WHERE` of its statement: only
`active` checks change covers, only a `parked` one is restored, only a zone/table of THIS hub is
edited. That decides correctly **what** gets written. What was missing is the other half: that
writing **nothing** is an ERROR.

Without it the command answered `ok:true` with a fresh `new_ids` and — much worse — wrote its
`emit` into the outbox. The waiter corrected the covers of a check and the screen said saved; it
was not. And `tables.session.parked`, `tables.session.updated`, `tables.zone.updated` and
`tables.table.updated` reached the bus for operations that never happened, so any listener or
`flows` automation acted on a fact that did not exist.

`expect_rows` (hub#139) is the declaration that closes it: below `n` affected rows the runtime
rolls the WHOLE transaction back — mutation AND outbox — and answers the module's own namespaced
code instead of a generic `ok`.

⚠️ The gate sums the rows of ALL the `sql[]` of the command, not of the guarded statement
(hub#1091). So a multi-statement command needs every statement gated on the SAME precondition, or
an unconditional neighbour pays the toll for the one that refused and the guard is neutralised.
That is what the `masking` tests below exist to catch — they are the ones that fail if someone
later adds an unconditional statement to `park` or `restore`.

Usage: tests/write_gates.postgres.test.py
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

harness.DB = f"tables_write_gates_test_{harness.os.getpid()}"
DB = harness.DB
HUB = harness.HUB
psql = harness.psql
q = harness.q
check = harness.check
command_ok = harness.command_ok
run_command = harness.run_command
outbox_count = harness.outbox_count
DomainError = harness.DomainError
failures = harness.failures

T0 = "2026-08-18T12:00:00+00:00"


def command_rejected(label: str, name: str, payload: dict, now: str, code: str) -> None:
    """A command whose precondition does not hold must FAIL with its domain code — and leave the
    bus untouched. Asserting the error alone would miss the defect that hurts: the phantom event."""
    emitted = harness.MANIFEST["commands"][name].get("emit", [])
    before = {e: outbox_count(e) for e in emitted}
    try:
        ok, err = run_command(name, payload, now)
    except DomainError as exc:
        check(f"{label} — rejected with its domain code", code, exc.code)
    else:
        got = "ok:true" if ok else f"error `{err.splitlines()[-1] if err else ''}`"
        check(f"{label} — rejected with its domain code", code, got)
    for event in emitted:
        check(
            f"{label} — `{event}` never reached the bus",
            before[event],
            outbox_count(event),
        )


def seed():
    for zid, name, order in (("z1", "Dining room", 1), ("z2", "Terrace", 2)):
        psql(
            [
                "-c",
                (
                    f"INSERT INTO tables_zone (id, hub_id, name, description, color, sort_order, "
                    f"is_active, is_deleted, created_at) VALUES "
                    f"('{zid}', '{HUB}', '{name}', '', 'primary', {order}, 1, 0, '{T0}')"
                ),
            ],
            db=DB,
        )
    for tid, zid, number in (("t1", "z1", "1"), ("t2", "z1", "2"), ("t3", "z2", "3")):
        psql(
            [
                "-c",
                (
                    f"INSERT INTO tables_table (id, hub_id, zone_id, number, name, capacity, shape, "
                    f"status, is_active, position_x, position_y, width, height, is_deleted, created_at) "
                    f"VALUES ('{tid}', '{HUB}', '{zid}', '{number}', '', 4, 'square', 'available', 1, "
                    f"0, 0, 88, 88, 0, '{T0}')"
                ),
            ],
            db=DB,
        )


GHOST = "00000000-0000-4000-8000-000000000999"


def test_a_check_that_is_no_longer_open_refuses_the_write():
    print("\n== 1. a check that is no longer open refuses the write (tables#54) ==")
    command_ok(
        "a party of 2 sits at table 1",
        "tables._session_open",
        {
            "session_id": "s1",
            "table_id": "t1",
            "guests_count": 2,
            "waiter_id": None,
            "notes": "",
        },
        T0,
    )
    command_ok(
        "the covers are corrected while the check is open",
        "tables.sessions.set_guests",
        {"session_id": "s1", "guests_count": 5},
        "2026-08-18T12:10:00+00:00",
    )
    check(
        "the correction was written",
        "5",
        q("SELECT guests_count FROM tables_session WHERE id = 's1'"),
    )
    check(
        "and the legitimate path DID announce it",
        1,
        outbox_count("tables.session.updated"),
    )

    command_ok(
        "the party pays and the check closes",
        "tables._session_close",
        {"session_id": "s1", "notes": None},
        "2026-08-18T13:00:00+00:00",
    )
    command_rejected(
        "correcting the covers of a CLOSED check",
        "tables.sessions.set_guests",
        {"session_id": "s1", "guests_count": 99},
        "2026-08-18T13:05:00+00:00",
        "tables.session_not_active",
    )
    check(
        "the closed check keeps the covers it was served with",
        "5",
        q("SELECT guests_count FROM tables_session WHERE id = 's1'"),
    )
    command_rejected(
        "correcting the covers of a check that does not exist",
        "tables.sessions.set_guests",
        {"session_id": GHOST, "guests_count": 4},
        "2026-08-18T13:06:00+00:00",
        "tables.session_not_active",
    )
    command_rejected(
        "linking an order to a check that is not open",
        "tables.sessions.link_order",
        {"session_id": "s1", "table_id": None, "order_id": "O-ghost"},
        "2026-08-18T13:07:00+00:00",
        "tables.session_not_active",
    )


def test_parking_and_restoring_refuse_out_of_state():
    print(
        "\n== 2. parking / restoring refuse out of state, and do not announce (tables#54) =="
    )
    command_ok(
        "a party sits at table 2",
        "tables._session_open",
        {
            "session_id": "s2",
            "table_id": "t2",
            "guests_count": 3,
            "waiter_id": None,
            "notes": "",
        },
        "2026-08-18T14:00:00+00:00",
    )
    command_ok(
        "the check is parked so the table can be re-seated",
        "tables.sessions.park",
        {"session_id": "s2"},
        "2026-08-18T14:30:00+00:00",
    )
    check(
        "the check is parked",
        "parked",
        q("SELECT status FROM tables_session WHERE id = 's2'"),
    )
    check(
        "its table went back to the plan",
        "available",
        q("SELECT status FROM tables_table WHERE id = 't2'"),
    )
    check("and the real park DID announce it", 1, outbox_count("tables.session.parked"))

    command_rejected(
        "parking a check that is already parked",
        "tables.sessions.park",
        {"session_id": "s2"},
        "2026-08-18T14:31:00+00:00",
        "tables.session_not_active",
    )
    command_rejected(
        "parking a check that does not exist",
        "tables.sessions.park",
        {"session_id": GHOST},
        "2026-08-18T14:32:00+00:00",
        "tables.session_not_active",
    )

    command_ok(
        "the party comes back and is seated at table 3",
        "tables.sessions.restore",
        {"session_id": "s2", "table_id": "t3", "operation_id": ""},
        "2026-08-18T15:00:00+00:00",
    )
    check(
        "the check is live again",
        "active",
        q("SELECT status FROM tables_session WHERE id = 's2'"),
    )
    check(
        "table 3 is taken",
        "occupied",
        q("SELECT status FROM tables_table WHERE id = 't3'"),
    )
    check(
        "and the real restore DID announce it",
        1,
        outbox_count("tables.session.restored"),
    )

    command_rejected(
        "restoring a check that does not exist",
        "tables.sessions.restore",
        {"session_id": GHOST, "table_id": "t1", "operation_id": ""},
        "2026-08-18T15:01:00+00:00",
        "tables.session_not_parked",
    )


def test_the_gate_is_not_neutralised_by_a_neighbour_statement():
    print(
        "\n== 3. hub#1091: a neighbour statement must not pay the toll for the refusal =="
    )
    # `restore` runs FOUR statements. Re-seating a check that is already seated must not slip
    # through just because occupying a table always affects a row: that is exactly how a batch
    # neutralises the guard of the one statement that refused.
    command_rejected(
        "re-seating a check that is already seated, onto a FREE table",
        "tables.sessions.restore",
        {"session_id": "s2", "table_id": "t1", "operation_id": ""},
        "2026-08-18T15:10:00+00:00",
        "tables.session_not_parked",
    )
    check(
        "the free table was NOT taken by the refused restore",
        "available",
        q("SELECT status FROM tables_table WHERE id = 't1'"),
    )
    check(
        "the check did not move",
        "t3",
        q("SELECT table_id FROM tables_session WHERE id = 's2'"),
    )
    check(
        "and no stray leg was written into the history",
        "1",
        q(
            "SELECT count(*) FROM tables_session_assignment WHERE session_id = 's2' AND released_at IS NULL"
        ),
    )
    command_rejected(
        "re-seating a check that is already seated, onto ITS OWN table",
        "tables.sessions.restore",
        {"session_id": "s2", "table_id": "t3", "operation_id": ""},
        "2026-08-18T15:11:00+00:00",
        "tables.session_not_parked",
    )

    # `park` runs THREE. Parking a check that is not active must count zero across all of them.
    command_ok(
        "the party at table 3 pays",
        "tables._session_close",
        {"session_id": "s2", "notes": None},
        "2026-08-18T16:00:00+00:00",
    )
    command_rejected(
        "parking a CLOSED check",
        "tables.sessions.park",
        {"session_id": "s2"},
        "2026-08-18T16:01:00+00:00",
        "tables.session_not_active",
    )


def test_editing_something_that_is_not_there_is_an_error():
    print(
        "\n== 4. editing a zone/table that is not there is an error, not an `ok` (tables#54) =="
    )
    command_ok(
        "renaming a real zone works",
        "tables.zones.update",
        {
            "zone_id": "z2",
            "name": "Terrace (heated)",
            "description": "",
            "color": "tertiary",
            "sort_order": 2,
            "is_active": 1,
        },
        "2026-08-18T17:00:00+00:00",
    )
    check(
        "the zone was renamed",
        "Terrace (heated)",
        q("SELECT name FROM tables_zone WHERE id = 'z2'"),
    )

    command_rejected(
        "renaming a zone that does not exist",
        "tables.zones.update",
        {
            "zone_id": GHOST,
            "name": "Nowhere",
            "description": "",
            "color": "primary",
            "sort_order": 9,
            "is_active": 1,
        },
        "2026-08-18T17:01:00+00:00",
        "tables.zone_not_found",
    )
    check(
        "no zone was created behind the refusal",
        "2",
        q("SELECT count(*) FROM tables_zone WHERE is_deleted = 0"),
    )

    command_rejected(
        "editing a table that does not exist",
        "tables.tables.update",
        {
            "table_id": GHOST,
            "number": "ZZ",
            "name": "",
            "capacity": 4,
            "zone_id": "z1",
            "shape": "square",
            "status": "available",
            "is_active": 1,
        },
        "2026-08-18T17:02:00+00:00",
        "tables.table_not_found",
    )
    command_rejected(
        "dragging a table that does not exist",
        "tables.tables.move",
        {
            "table_id": GHOST,
            "position_x": 10,
            "position_y": 10,
            "width": 88,
            "height": 88,
        },
        "2026-08-18T17:03:00+00:00",
        "tables.table_not_found",
    )
    command_rejected(
        "holding a table that does not exist",
        "tables.tables.hold",
        {
            "table_id": GHOST,
            "source": "reservations",
            "source_ref": "r-ghost",
            "held_from": "2026-08-18T20:00:00",
            "held_until": "2026-08-18T22:00:00",
            "party_size": 2,
            "label": "Nobody",
        },
        "2026-08-18T17:04:00+00:00",
        "tables.table_not_found",
    )
    check("no hold was recorded", "0", q("SELECT count(*) FROM tables_table_hold"))

    command_ok(
        "holding a real table works",
        "tables.tables.hold",
        {
            "table_id": "t1",
            "source": "reservations",
            "source_ref": "r-1",
            "held_from": "2026-08-18T20:00:00",
            "held_until": "2026-08-18T22:00:00",
            "party_size": 2,
            "label": "Ana",
        },
        "2026-08-18T17:05:00+00:00",
    )
    check(
        "the table is painted reserved",
        "reserved",
        q("SELECT status FROM tables_table WHERE id = 't1'"),
    )


def test_releasing_a_hold_that_is_not_there_is_an_error():
    print(
        "\n== 5. releasing a hold that is not there must not announce a release (tables#61) =="
    )
    # THE LEAK this test exists to catch. `release_hold` runs TWO statements:
    #   1. `table_hold_release.sql` — the GUARDED one: flips THIS hold to `released`.
    #   2. `_hold_free_stale.sql`   — a HUB-WIDE sweep: hands back to the plan every table still
    #                                 painted `reserved` with no live reason.
    # A plain `min: 1` on the batch SUM would be paid by the sweep alone, so releasing a reference
    # that does not exist would answer ok and put `tables.table.hold_released` on the bus for a
    # release that never happened. The sweep has work to do here ON PURPOSE: t2 is painted
    # `reserved` while its own hold already expired — the real state of a floor between a booking's
    # window closing and `expire_holds` running (every 15 min). Without this neighbour the test
    # passes whether the gate is anchored or not, which is to say it proves nothing.
    psql(
        [
            "-c",
            (
                f"INSERT INTO tables_table_hold (id, hub_id, table_id, source, source_ref, "
                f"held_from, held_until, party_size, label, status, is_deleted, created_at, "
                f"updated_at) VALUES ('h-stale', '{HUB}', 't2', 'reservations', 'r-stale', "
                f"'2026-08-18T09:00:00', '2026-08-18T11:00:00', 2, 'Nobody', 'expired', 0, "
                f"'{T0}', '{T0}')"
            ),
        ],
        db=DB,
    )
    psql(["-c", "UPDATE tables_table SET status = 'reserved' WHERE id = 't2'"], db=DB)
    check(
        "the stale neighbour is there for the sweep to find",
        "reserved",
        q("SELECT status FROM tables_table WHERE id = 't2'"),
    )

    command_rejected(
        "releasing a hold that was never taken",
        "tables.tables.release_hold",
        {"source": "reservations", "source_ref": "r-ghost"},
        "2026-08-18T17:06:00+00:00",
        "tables.hold_not_found",
    )
    check(
        "the refused release swept nothing either",
        "reserved",
        q("SELECT status FROM tables_table WHERE id = 't2'"),
    )

    # And the legitimate release still does its job: the hold dies AND its table goes back on the
    # plan. A guard that also blocks the real case is not a fix.
    command_ok(
        "releasing the hold that IS there",
        "tables.tables.release_hold",
        {"source": "reservations", "source_ref": "r-1"},
        "2026-08-18T17:07:00+00:00",
    )
    check(
        "the hold is marked released",
        "released",
        q("SELECT status FROM tables_table_hold WHERE source_ref = 'r-1'"),
    )
    check(
        "the released table is back on the plan",
        "available",
        q("SELECT status FROM tables_table WHERE id = 't1'"),
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
        for mig in sorted(
            (harness.MODULE_DIR / "migrations" / "postgres").glob("*.sql")
        ):
            psql([], db=DB, stdin=mig.read_text())
        seed()

        test_a_check_that_is_no_longer_open_refuses_the_write()
        test_parking_and_restoring_refuse_out_of_state()
        test_the_gate_is_not_neutralised_by_a_neighbour_statement()
        test_editing_something_that_is_not_there_is_an_error()
        test_releasing_a_hold_that_is_not_there_is_an_error()
    finally:
        psql(["-c", f"DROP DATABASE IF EXISTS {DB} WITH (FORCE)"])

    print()
    if failures:
        print(f"FAILED — {len(failures)} assertion(s):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("PASS — a write that touches nothing fails and announces nothing (tables#54)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
