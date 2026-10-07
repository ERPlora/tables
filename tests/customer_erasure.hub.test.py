#!/usr/bin/env python3
"""Erasing a customer's personal data empties her name on the floor plan — pm#637 (tables layer,
TABLES-F31), against the REAL kernel.

The gesture is the one a restaurant makes: **Clientes → Borrar datos personales**.
`customers.anonymize` rewrites the sheet and publishes `customer.anonymized`; the runtime's outbox
relay hands it to every module that listens, with `:hub_id` and `:now` injected by the host. Before
pm#637 `tables` did not listen: the name a confirmed reservation copied into its table hold kept
being painted on the plan and in «Choose table» for as long as the hold lived.

The Postgres battery next door (`customer_erasure.postgres.test.py`) pins every statement, the
idempotence guard, the empty id and the tenancy with two hubs. This one proves what only the
runtime can: that the REAL `reservations` hands the customer id to `tables` when it confirms, that
the event the REAL `customers` emits reaches this module's listener, and that the plan the
restaurant opens afterwards keeps the table reserved without her name.

Usage: tests/customer_erasure.hub.test.py   (exit 0 = green)
  Needs a live runtime with `customers`+`reservations`+`tables` installed (see tests/hub_harness.py).
  Without one it FAILS.
"""

import datetime
import sys
import uuid

from hub_harness import Hub, key, wait_until

# The relay delivers on its own tick, after the command committed: wait for it, never sleep blind.
RELAY_DEADLINE_SECONDS = 60


def new_id(hub: Hub, name: str, payload: dict) -> str:
    out = hub.run(name, payload)
    created = (out.get("new_ids") or [None])[0]
    if not isinstance(created, str) or not created:
        raise AssertionError(f"{name} did not answer new_ids[0]: {out}")
    return created


def create_table(hub: Hub, zone_id: str) -> str:
    return new_id(
        hub,
        "tables.tables.create",
        {
            "zone_id": zone_id,
            "number": key("erase"),
            "name": "",
            "capacity": 4,
            "position_x": 0,
            "position_y": 0,
            "width": 10,
            "height": 10,
            "shape": "square",
        },
    )


def plan_row(hub: Hub, table_id: str) -> dict:
    """The row the floor plan and «Choose table» paint (`tables.tables.list`)."""
    rows = hub.query("tables.tables.list", {"sort": "number_sort", "dir": "asc"})
    return next((r for r in rows if r.get("id") == table_id), {})


def book(
    hub: Hub, customer_id: str, guest: str, table_id: str, day: str, at: str
) -> str:
    """A reservation with a table, CONFIRMED after it is born (TABLES-F25 holds only then)."""
    reservation_id = new_id(
        hub,
        "reservations.reservations.create",
        {
            "customer_id": customer_id,
            "guest_name": guest,
            "date": day,
            "time": at,
            "party_size": 4,
            "table_id": table_id,
        },
    )
    hub.run(
        "reservations.reservations.set_status",
        {"reservation_id": reservation_id, "status": "confirmed"},
    )
    return reservation_id


def main() -> int:
    hub = Hub("customer_erasure.hub", needs=("customers", "reservations", "tables"))
    mark = uuid.uuid4().hex[:6]
    name = f"Ana Erase {mark}"
    other_name = f"Luis {mark}"

    customer_id = new_id(
        hub, "customers.create", {"name": name, "phone": "+34600000001"}
    )
    someone_id = new_id(
        hub, "customers.create", {"name": other_name, "phone": "+34611111111"}
    )

    zone_id = new_id(
        hub,
        "tables.zones.create",
        {"name": f"Erase {mark}", "description": "", "color": "primary", "sort_order": 90},
    )
    hers = create_table(hub, zone_id)
    theirs = create_table(hub, zone_id)

    # A week ahead: inside the default booking window, and far from the 15-minute expiry sweep. An
    # open service every day of the week so the weekday convention does not matter here.
    day = (datetime.date.today() + datetime.timedelta(days=7)).isoformat()
    for dow in range(7):
        hub.run(
            "reservations.timeslots.create",
            {
                "day_of_week": dow,
                "start_time": "12:00",
                "end_time": "23:00",
                "max_reservations": 50,
            },
        )

    print("§0 she and someone else book a table each, and both are confirmed")
    book(hub, customer_id, name, hers, day, "21:00")
    book(hub, someone_id, other_name, theirs, day, "21:00")

    held = wait_until(
        lambda: plan_row(hub, hers),
        accept=lambda r: bool(r.get("reserved_for")),
        timeout=RELAY_DEADLINE_SECONDS,
    )
    hub.check(
        "§0 control armed: the plan paints her name", held.get("reserved_for"), name
    )
    hub.check(
        "§0 the plan knows whose hold it is",
        held.get("reserved_customer_id"),
        customer_id,
    )
    hub.check(
        "§0 control armed: the other table paints the other name",
        wait_until(
            lambda: plan_row(hub, theirs).get("reserved_for"),
            timeout=RELAY_DEADLINE_SECONDS,
        ),
        other_name,
    )

    print("§1 Clientes → Borrar datos personales")
    hub.run(
        "customers.anonymize", {"customer_id": customer_id, "reason": "GDPR request"}
    )

    erased = wait_until(
        lambda: plan_row(hub, hers),
        accept=lambda r: not r.get("reserved_for"),
        timeout=RELAY_DEADLINE_SECONDS,
    )

    print("§2 the plan no longer names her, and the table is still hers")
    hub.check("§2 her hold has no name", erased.get("reserved_for"), "")
    hub.check(
        "§2 her hold keeps her id (the screen reads «Deleted customer»)",
        erased.get("reserved_customer_id"),
        customer_id,
    )
    hub.check("§2 the table is still reserved", erased.get("status"), "reserved")
    hub.check("§2 the hold keeps its party size", erased.get("reserved_party_size"), 4)
    hub.check_true(
        "§2 the hold keeps its time",
        str(erased.get("reserved_from") or "").startswith(f"{day}T21:00"),
        f"reserved_from: {erased.get('reserved_from')!r}",
    )

    print("§3 nobody else's hold is touched")
    other = plan_row(hub, theirs)
    hub.check(
        "§3 the other table keeps the other name", other.get("reserved_for"), other_name
    )
    hub.check(
        "§3 the other table keeps its id", other.get("reserved_customer_id"), someone_id
    )

    return hub.finish(
        "erasing a customer empties her name on the floor plan and keeps the table reserved"
    )


if __name__ == "__main__":
    sys.exit(main())
