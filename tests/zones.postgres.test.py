#!/usr/bin/env python3
"""Zones view contract (tables#3 / tables#4) — runs against a REAL Postgres 18 in Docker.

The Zones screen lists the zones with their OCCUPANCY: how many tables each zone has and how many
of them are free right now. Every reference (Square "Sections", Toast "Service areas", Lightspeed
"Floor plans", Clover/Revel/TouchBistro "Sections", Odoo "Floors") shows the section together with
its tables; a zone list without counts is a list of names. The aggregates come from the query
itself (`tables.zones.list`), not from the UI counting a second list: the list is paginated and the
UI must not fetch every table of the hub to paint a number.

Reuses the miniature runtime of `floor.postgres.test.py` (same container, own scratch DB).

Usage: tests/zones.postgres.test.py
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

harness.DB = f"tables_zones_test_{harness.os.getpid()}"
DB = harness.DB
HUB = harness.HUB
psql = harness.psql
q = harness.q
check = harness.check
run_query = harness.run_query
command_ok = harness.command_ok
failures = harness.failures


def seed_zones():
    """Two zones: the dining room with 3 tables (one occupied, one soft-deleted) and an empty
    terrace. The deleted table must NOT count; the occupied one counts as a table but not as
    available."""
    rows = [
        ("z1", "Dining room", 1),
        ("z2", "Terrace", 2),
    ]
    for zid, name, order in rows:
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
    tables = [
        ("t1", "z1", "1", "available", 0),
        ("t2", "z1", "2", "occupied", 0),
        ("t3", "z1", "3", "available", 1),  # soft-deleted: must not count
    ]
    for tid, zid, number, status, deleted in tables:
        psql(
            [
                "-c",
                (
                    f"INSERT INTO tables_table (id, hub_id, zone_id, number, name, capacity, shape, "
                    f"status, is_active, position_x, position_y, width, height, is_deleted, created_at) "
                    f"VALUES ('{tid}', '{HUB}', '{zid}', '{number}', '', 4, 'square', '{status}', 1, "
                    f"0, 0, 10, 10, {deleted}, '2026-08-07T09:00:00+00:00')"
                ),
            ],
            db=DB,
        )
    # A table of ANOTHER hub in the same zone id must never leak into the counts.
    psql(
        [
            "-c",
            (
                "INSERT INTO tables_table (id, hub_id, zone_id, number, name, capacity, shape, "
                "status, is_active, position_x, position_y, width, height, is_deleted, created_at) "
                "VALUES ('tx', 'hub-other', 'z1', '9', '', 4, 'square', 'available', 1, "
                "0, 0, 10, 10, 0, '2026-08-07T09:00:00+00:00')"
            ),
        ],
        db=DB,
    )


def test_zone_list_carries_occupancy():
    print(
        "\n== zones.list carries table_count / available_tables_count per zone (tables#4) =="
    )
    rows = {r["id"]: r for r in run_query("tables.zones.list", {})}
    check("both zones are listed", ["z1", "z2"], sorted(rows.keys()))
    check(
        "dining room counts its 2 live tables (not the deleted one, not the other hub's)",
        2,
        rows.get("z1", {}).get("table_count"),
    )
    check(
        "dining room has 1 available table (the occupied one is not)",
        1,
        rows.get("z1", {}).get("available_tables_count"),
    )
    check("an empty zone counts 0 tables", 0, rows.get("z2", {}).get("table_count"))
    check(
        "an empty zone has 0 available tables",
        0,
        rows.get("z2", {}).get("available_tables_count"),
    )
    check(
        "the list still returns one row per zone (the JOIN does not multiply)",
        2,
        len(rows),
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
        seed_zones()
        test_zone_list_carries_occupancy()
    finally:
        psql(["-c", f"DROP DATABASE IF EXISTS {DB} WITH (FORCE)"])

    print()
    if failures:
        print(f"FAILED — {len(failures)} assertion(s):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("PASS — the zones list carries its occupancy (tables#4)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
