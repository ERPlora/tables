#!/usr/bin/env python3
"""Room settings contract (tables#3 c) — runs against a REAL Postgres 18 in Docker.

The `settings` nav entry used to mount the table list — a false door. The market keeps a small
set of ROOM settings (Square "table management settings": timer colour thresholds + track cover
count; Lightspeed: "Cover count prompt" per floor plan; Toast/Revel: table-service settings in
back-office). Ours: `prompt_guests_on_seat`, `timer_warning_minutes`, `timer_critical_minutes` —
a singleton row per hub, upserted by `tables.settings.update`, read by `tables.settings.get`.

Reuses the miniature runtime of `floor.postgres.test.py` (same container, own scratch DB).

Usage: tests/settings.postgres.test.py
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

harness.DB = f"tables_settings_test_{harness.os.getpid()}"
DB = harness.DB
HUB = harness.HUB
psql = harness.psql
q = harness.q
check = harness.check
run_query = harness.run_query
command_ok = harness.command_ok
failures = harness.failures


def test_settings_singleton_upsert():
    print(
        "\n== room settings: singleton per hub, upsert, tenant-scoped (tables#3 c) =="
    )
    check(
        "no row yet → the query returns nothing (the UI falls back to schema defaults)",
        [],
        run_query("tables.settings.get", {}),
    )

    command_ok(
        "first save creates the row",
        "tables.settings.update",
        {
            "prompt_guests_on_seat": 0,
            "timer_warning_minutes": 45,
            "timer_critical_minutes": 75,
        },
        "2026-08-18T09:00:00+00:00",
    )
    rows = run_query("tables.settings.get", {})
    check("one row", 1, len(rows))
    check(
        "prompt_guests_on_seat persisted",
        0,
        rows[0].get("prompt_guests_on_seat") if rows else None,
    )
    check(
        "timer_warning_minutes persisted",
        45,
        rows[0].get("timer_warning_minutes") if rows else None,
    )
    check(
        "timer_critical_minutes persisted",
        75,
        rows[0].get("timer_critical_minutes") if rows else None,
    )

    command_ok(
        "second save UPDATES the same row (no duplicate)",
        "tables.settings.update",
        {
            "prompt_guests_on_seat": 1,
            "timer_warning_minutes": 60,
            "timer_critical_minutes": 90,
        },
        "2026-08-18T10:00:00+00:00",
    )
    check(
        "still one row",
        "1",
        q(f"SELECT count(*) FROM tables_settings WHERE hub_id = '{HUB}'"),
    )
    rows = run_query("tables.settings.get", {})
    check(
        "prompt_guests_on_seat updated",
        1,
        rows[0].get("prompt_guests_on_seat") if rows else None,
    )
    check(
        "timer_warning_minutes updated",
        60,
        rows[0].get("timer_warning_minutes") if rows else None,
    )

    # Another hub never sees this hub's row.
    check(
        "another hub sees no settings",
        [],
        run_query("tables.settings.get", {"hub_id": "hub-other"}),
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
        test_settings_singleton_upsert()
    finally:
        psql(["-c", f"DROP DATABASE IF EXISTS {DB} WITH (FORCE)"])

    print()
    if failures:
        print(f"FAILED — {len(failures)} assertion(s):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("PASS — room settings are a tenant-scoped singleton (tables#3 c)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
