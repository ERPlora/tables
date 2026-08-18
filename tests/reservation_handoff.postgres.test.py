#!/usr/bin/env python3
"""Reservation → table handoff by EVENT (ERPlora/reservations#13) — against a REAL Postgres.

`tables.tables.hold` / `release_hold` existed (tables#12) but nothing ever called them: the runtime
forbids a module from running another module's command, so `reservations` could not fire them. The
clean door is the one `tables` already uses for `order.completed`: LISTEN. `reservations` now emits
`reservations.reservation.status_changed` enriched with `table_id, date, time, duration_minutes,
party_size, guest_name`, and `tables` listens and holds/releases the table itself.

Contract under test:

  1. `confirmed` with a table → the table is held (`reserved` on the plan, guest name + window).
  2. The relay redelivers → still ONE hold (idempotent by `(source, source_ref)`).
  3. `cancelled` / `no_show` → the hold is released and the table is back on the plan.
  4. Re-confirming a NEW reservation for the same table works after the release.
  5. A status change WITHOUT a table (walk-in reservation, no assignment) holds nothing.
  6. `reservations.reservation.updated` with a new `table_id` MOVES a live hold; `''` unassigns.

Reuses the runtime-in-miniature of `floor.postgres.test.py` (same container, own scratch DB).
Usage: tests/reservation_handoff.postgres.test.py   (exit 0 = green)
"""

import importlib.util
import pathlib
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("floor", HERE / "floor.postgres.test.py")
floor = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(floor)

floor.DB = f"tables_handoff_test_{floor.os.getpid()}"
HUB = floor.HUB
q, check, command_ok, table_status, psql = (
    floor.q,
    floor.check,
    floor.command_ok,
    floor.table_status,
    floor.psql,
)

LISTENER_STATUS = "reservations.reservation.status_changed"
LISTENER_UPDATED = "reservations.reservation.updated"


def listener_for(event: str) -> str:
    cmd = (
        floor.MANIFEST.get("events", {}).get("listen", {}).get(event, {}).get("command")
    )
    return cmd or ""


def status_event(status: str, table_id, reservation_id="r-ana", **extra) -> dict:
    """The payload `reservations` emits (enriched by its handler from the reservation row)."""
    p = {
        "sender": "reservations",
        "reservation_id": reservation_id,
        "status": status,
        "previous_status": "pending",
        "cancellation_reason": None,
        "table_id": table_id,
        "date": "2026-08-20",
        "time": "21:00:00",
        "duration_minutes": 90,
        "party_size": 4,
        "guest_name": "Ana",
        "customer_id": None,
    }
    p.update(extra)
    return p


def hold_row(ref: str) -> dict:
    row = q(
        f"SELECT status || '|' || table_id || '|' || label || '|' || held_from || '|' || held_until "
        f"FROM tables_table_hold WHERE hub_id = '{HUB}' AND source = 'reservations' "
        f"AND source_ref = '{ref}' AND is_deleted = 0"
    )
    parts = row.split("|") if row and not row.startswith("<") else []
    keys = ["status", "table_id", "label", "held_from", "held_until"]
    return dict(zip(keys, parts)) if len(parts) == 5 else {"raw": row}


def holds_for(ref: str) -> str:
    return q(
        f"SELECT count(*) FROM tables_table_hold WHERE hub_id = '{HUB}' "
        f"AND source = 'reservations' AND source_ref = '{ref}' AND is_deleted = 0"
    )


def test_status_change_drives_the_hold():
    print("\n== reservations#13: the status change holds and releases the table ==")
    listener = listener_for(LISTENER_STATUS)
    check(f"tables listens to {LISTENER_STATUS}", True, bool(listener))
    if not listener:
        return

    # 1. confirmed → held
    command_ok(
        "confirmed reservation with a table",
        listener,
        status_event("confirmed", "t1"),
        "2026-08-20T18:00:00+00:00",
    )
    check("table 1 is painted reserved", "reserved", table_status("t1"))
    row = hold_row("r-ana")
    check("the hold is live", "held", row.get("status"))
    check("the hold points at table 1", "t1", row.get("table_id"))
    check("the plan knows the guest", "Ana", row.get("label"))
    check("held from the booking time", "2026-08-20T21:00:00", row.get("held_from"))
    check("held until booking + duration", "2026-08-20T22:30:00", row.get("held_until"))

    # 2. redelivery
    command_ok(
        "the relay redelivers the confirmation",
        listener,
        status_event("confirmed", "t1"),
        "2026-08-20T18:00:05+00:00",
    )
    check("still one hold", "1", holds_for("r-ana"))
    check("table 1 still reserved", "reserved", table_status("t1"))

    # 3. cancelled → released, table back
    command_ok(
        "the reservation is cancelled",
        listener,
        status_event(
            "cancelled", "t1", previous_status="confirmed", cancellation_reason="sick"
        ),
        "2026-08-20T19:00:00+00:00",
    )
    check("the hold is released", "released", hold_row("r-ana").get("status"))
    check("table 1 is back on the plan", "available", table_status("t1"))

    # 4. a NEW reservation for the same table after the release
    command_ok(
        "another party confirmed on table 1",
        listener,
        status_event("confirmed", "t1", reservation_id="r-bea", guest_name="Bea"),
        "2026-08-20T19:05:00+00:00",
    )
    check("table 1 reserved for Bea", "reserved", table_status("t1"))
    check("Bea's hold is live", "held", hold_row("r-bea").get("status"))
    # no_show frees it too
    command_ok(
        "Bea does not show up",
        listener,
        status_event(
            "no_show", "t1", reservation_id="r-bea", previous_status="confirmed"
        ),
        "2026-08-20T21:30:00+00:00",
    )
    check("Bea's hold is released", "released", hold_row("r-bea").get("status"))
    check("table 1 available again", "available", table_status("t1"))

    # 5. no table → nothing to hold
    command_ok(
        "confirmed reservation WITHOUT a table",
        listener,
        status_event("confirmed", None, reservation_id="r-walk"),
        "2026-08-20T19:10:00+00:00",
    )
    check("no hold without a table", "0", holds_for("r-walk"))

    # seated / completed do not touch the hold (opening the session consumes it — tables#12)
    command_ok(
        "confirmed on table 2",
        listener,
        status_event("confirmed", "t2", reservation_id="r-cid", guest_name="Cid"),
        "2026-08-20T19:20:00+00:00",
    )
    command_ok(
        "seated (announced by reservations, no session yet)",
        listener,
        status_event(
            "seated", "t2", reservation_id="r-cid", previous_status="confirmed"
        ),
        "2026-08-20T21:00:00+00:00",
    )
    check(
        "seated leaves the hold to the session gate",
        "held",
        hold_row("r-cid").get("status"),
    )
    check("table 2 stays reserved until someone sits", "reserved", table_status("t2"))


def test_update_moves_the_hold():
    print(
        "\n== reservations#13: editing the table of a confirmed reservation moves the hold =="
    )
    listener = listener_for(LISTENER_UPDATED)
    check(f"tables listens to {LISTENER_UPDATED}", True, bool(listener))
    if not listener:
        return
    status_listener = listener_for(LISTENER_STATUS)

    command_ok(
        "Dan confirmed on table 5",
        status_listener,
        status_event("confirmed", "t5", reservation_id="r-dan", guest_name="Dan"),
        "2026-08-20T19:30:00+00:00",
    )
    # The `updated` event carries the caller payload of `reservations.reservations.update`:
    # only the fields that were sent (`null` = untouched, `''` on table_id = unassign).
    command_ok(
        "moved to table 8",
        listener,
        {
            "reservation_id": "r-dan",
            "table_id": "t8",
            "guest_name": None,
            "date": None,
            "time": None,
        },
        "2026-08-20T19:31:00+00:00",
    )
    row = hold_row("r-dan")
    check("the hold now points at table 8", "t8", row.get("table_id"))
    check("the hold is still live", "held", row.get("status"))
    check("table 8 is reserved", "reserved", table_status("t8"))
    check("table 5 is back on the plan", "available", table_status("t5"))

    command_ok(
        "edited without touching the table",
        listener,
        {"reservation_id": "r-dan", "table_id": None, "notes": "window seat"},
        "2026-08-20T19:32:00+00:00",
    )
    check(
        "an untouched table_id leaves the hold alone",
        "t8",
        hold_row("r-dan").get("table_id"),
    )

    command_ok(
        "table unassigned",
        listener,
        {"reservation_id": "r-dan", "table_id": ""},
        "2026-08-20T19:33:00+00:00",
    )
    check("unassigning releases the hold", "released", hold_row("r-dan").get("status"))
    check("table 8 is back on the plan", "available", table_status("t8"))

    # A pending (never confirmed) reservation edited with a table must NOT create a hold:
    # only `confirmed` holds; `updated` may only MOVE a live one.
    command_ok(
        "pending reservation edited with a table",
        listener,
        {"reservation_id": "r-pending", "table_id": "t5"},
        "2026-08-20T19:34:00+00:00",
    )
    check("editing never creates a hold", "0", holds_for("r-pending"))
    check("table 5 untouched", "available", table_status("t5"))


def main() -> int:
    DB = floor.DB
    running = subprocess.run(
        ["docker", "inspect", "-f", "{{.State.Running}}", floor.CONTAINER],
        capture_output=True,
        text=True,
    )
    if "true" not in running.stdout:
        subprocess.run(["docker", "start", floor.CONTAINER], capture_output=True)

    psql(["-c", f"DROP DATABASE IF EXISTS {DB} WITH (FORCE)"])
    psql(["-c", f"CREATE DATABASE {DB}"])
    try:
        for mig in sorted((floor.MODULE_DIR / "migrations" / "postgres").glob("*.sql")):
            psql([], db=DB, stdin=mig.read_text())
        floor.seed_floor()
        test_status_change_drives_the_hold()
        test_update_moves_the_hold()
    finally:
        psql(["-c", f"DROP DATABASE IF EXISTS {DB} WITH (FORCE)"])

    print()
    if floor.failures:
        print(f"FAILED — {len(floor.failures)} assertion(s):")
        for f in floor.failures:
            print(f"  - {f}")
        return 1
    print("PASS — the reservation drives the table by event (reservations#13)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
