#!/usr/bin/env python3
"""Sessions view contract (tables#3 b) — runs against a REAL Postgres 18 in Docker.

The Sessions screen (Toast "All checks", Square "Orders") lists the table sessions and lets the
manager filter them BY ZONE: "what is open on the terrace right now". `tables.sessions.list` must
therefore carry the zone of the table the session sits on (`zone_id` for the `eq` filter, `zone`
for the eye) — resolved through the table, because a session only knows its `table_id`.

Reuses the miniature runtime of `floor.postgres.test.py` (same container, own scratch DB).

Usage: tests/sessions.postgres.test.py
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

harness.DB = f"tables_sessions_test_{harness.os.getpid()}"
DB = harness.DB
HUB = harness.HUB
psql = harness.psql
check = harness.check
run_query = harness.run_query
command_ok = harness.command_ok
failures = harness.failures


def seed():
    for zid, name, order in (("z1", "Dining room", 1), ("z2", "Terrace", 2)):
        psql(
            [
                "-c",
                (
                    f"INSERT INTO tables_zone (id, hub_id, name, description, color, sort_order, "
                    f"is_active, is_deleted, created_at) VALUES "
                    f"('{zid}', '{HUB}', '{name}', '', 'primary', {order}, 1, 0, '2026-08-07T09:00:00+00:00')"
                ),
            ],
            db=DB,
        )
    for tid, zid, number in (("t1", "z1", "1"), ("t2", "z2", "2")):
        psql(
            [
                "-c",
                (
                    f"INSERT INTO tables_table (id, hub_id, zone_id, number, name, capacity, shape, "
                    f"status, is_active, position_x, position_y, width, height, is_deleted, created_at) "
                    f"VALUES ('{tid}', '{HUB}', '{zid}', '{number}', '', 4, 'square', 'available', 1, "
                    f"0, 0, 10, 10, 0, '2026-08-07T09:00:00+00:00')"
                ),
            ],
            db=DB,
        )


def test_sessions_carry_their_zone():
    print(
        "\n== sessions.list carries the zone of the table (filter by zone, tables#3 b) =="
    )
    command_ok(
        "a party sits at table 1 (dining room)",
        "tables._session_open",
        {
            "session_id": "s1",
            "table_id": "t1",
            "guests_count": 2,
            "waiter_id": None,
            "notes": "",
        },
        "2026-08-07T20:00:00+00:00",
    )
    command_ok(
        "another party sits at table 2 (terrace)",
        "tables._session_open",
        {
            "session_id": "s2",
            "table_id": "t2",
            "guests_count": 3,
            "waiter_id": None,
            "notes": "",
        },
        "2026-08-07T20:05:00+00:00",
    )
    rows = {r["id"]: r for r in run_query("tables.sessions.list", {})}
    check("both sessions are listed", ["s1", "s2"], sorted(rows.keys()))
    check("session 1 knows its zone id", "z1", rows.get("s1", {}).get("zone_id"))
    check(
        "session 1 knows its zone name", "Dining room", rows.get("s1", {}).get("zone")
    )
    check("session 2 knows its zone id", "z2", rows.get("s2", {}).get("zone_id"))
    check("session 2 knows its zone name", "Terrace", rows.get("s2", {}).get("zone"))
    check(
        "the session still carries its table number",
        "2",
        rows.get("s2", {}).get("table_number"),
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
        test_sessions_carry_their_zone()
    finally:
        psql(["-c", f"DROP DATABASE IF EXISTS {DB} WITH (FORCE)"])

    print()
    if failures:
        print(f"FAILED — {len(failures)} assertion(s):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("PASS — sessions carry their zone (tables#3 b)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
