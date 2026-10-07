#!/usr/bin/env python3
"""What each check CHARGED (tables#96) — runs against a REAL Postgres 18 in Docker.

Sessions › Closed used to print the first 8 characters of the order's internal id under «Check»
and no amount anywhere: the owner, going over the service, saw a code and never what each table
paid. The market lists closed checks WITH their total (Toast «Closed checks», Square «Orders»,
Lightspeed «Closed receipts»).

`tables` never reads `sales` tables (contract §2.5). It learns the money the same way it learns the
order ended: from `sales`' events. `sale.completed` carries `order_id` + `total` (cents) for EVERY
charge — the partial ones of a split bill too — and `sale.voided` the same pair for an annulled
one. The module keeps its own ledger per SALE (idempotent: the outbox is at-least-once) and
`tables.sessions.list` projects `paid_total` = what the check's order charged and was not voided.

Usage: tests/session_paid_total.postgres.test.py
"""

import importlib.util
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location(
    "floor_harness", HERE / "floor.postgres.test.py"
)
harness = importlib.util.module_from_spec(_spec)
assert _spec.loader is not None
_spec.loader.exec_module(harness)

harness.DB = f"tables_paid_total_test_{harness.os.getpid()}"
DB = harness.DB
HUB = harness.HUB
OTHER_HUB = "hub-other"
psql = harness.psql
check = harness.check
run_query = harness.run_query
command_ok = harness.command_ok
failures = harness.failures
MANIFEST = harness.MANIFEST

AT = "2026-09-28T20:00:00+00:00"


def listener(event: str) -> str:
    """The command the manifest wires to an event — the test follows the REAL wiring, so a
    listener that is declared but never bound fails here instead of passing on its own."""
    target = MANIFEST.get("events", {}).get("listen", {}).get(event, {}).get("command")
    if not target:
        failures.append(f"no listener declared for `{event}`")
        print(f"  FAIL: no listener declared for `{event}`")
        return ""
    return target


def seed(hub: str, suffix: str) -> None:
    psql(
        [
            "-c",
            (
                f"INSERT INTO tables_zone (id, hub_id, name, description, color, sort_order, "
                f"is_active, is_deleted, created_at) VALUES "
                f"('z{suffix}', '{hub}', 'Room', '', 'primary', 1, 1, 0, '{AT}')"
            ),
        ],
        db=DB,
    )
    for n in ("1", "2"):
        psql(
            [
                "-c",
                (
                    f"INSERT INTO tables_table (id, hub_id, zone_id, number, name, capacity, "
                    f"shape, status, is_active, position_x, position_y, width, height, "
                    f"is_deleted, created_at) VALUES ('t{n}{suffix}', '{hub}', 'z{suffix}', "
                    f"'{n}', '', 4, 'square', 'available', 1, 0, 0, 10, 10, 0, '{AT}')"
                ),
            ],
            db=DB,
        )


def seat(hub: str, session_id: str, table_id: str, order_id: str) -> None:
    command_ok(
        f"a party sits at {table_id} ({hub})",
        "tables._session_open",
        {
            "hub_id": hub,
            "session_id": session_id,
            "table_id": table_id,
            "guests_count": 2,
            "waiter_id": None,
            "notes": "",
        },
        AT,
    )
    command_ok(
        f"the POS links order {order_id} to {session_id}",
        "tables.sessions.link_order",
        {
            "hub_id": hub,
            "table_id": table_id,
            "order_id": order_id,
            "session_id": session_id,
        },
        AT,
    )


def sale_completed(hub: str, sale_id: str, order_id, total: int, label: str) -> None:
    command_ok(
        label,
        listener("sale.completed"),
        # The payload `sales` emits (handler `complete_sale`): only what tables reads matters.
        {
            "hub_id": hub,
            "sender": "sales",
            "sale_id": sale_id,
            "order_id": order_id,
            "total": total,
        },
        AT,
    )


def sale_voided(hub: str, sale_id: str, order_id, total: int, label: str) -> None:
    command_ok(
        label,
        listener("sale.voided"),
        {
            "hub_id": hub,
            "sender": "sales",
            "sale_id": sale_id,
            "order_id": order_id,
            "total": total,
        },
        AT,
    )


def paid(session_id: str, hub: str = HUB):
    rows = {r["id"]: r for r in run_query("tables.sessions.list", {"hub_id": hub})}
    row = rows.get(session_id)
    if row is None:
        return "<session not listed>"
    return row.get("paid_total", "<no paid_total column>")


def test_a_check_says_what_it_charged():
    print(
        "\n== a check carries what its order charged, split bill included (tables#96) =="
    )
    seat(HUB, "sa", "t1a", "o-a")
    check("an open check that charged nothing yet reads no amount", None, paid("sa"))

    sale_completed(HUB, "sale-1", "o-a", 1500, "first partial charge (split bill)")
    check("one partial charge is on the check", 1500, paid("sa"))

    sale_completed(HUB, "sale-2", "o-a", 2350, "the final charge")
    check("both charges add up on the check", 3850, paid("sa"))

    sale_completed(HUB, "sale-2", "o-a", 2350, "the relay redelivers the final charge")
    check(
        "a redelivered sale is counted ONCE (outbox is at-least-once)", 3850, paid("sa")
    )

    command_ok(
        "the order ends: the check closes",
        listener("order.completed"),
        {"hub_id": HUB, "sender": "sales", "order_id": "o-a"},
        AT,
    )
    check("the check is closed", "closed", harness.session_status("sa"))
    check("the CLOSED check still says what it charged", 3850, paid("sa"))


def open_segments(session_id: str) -> str:
    """How many history segments of the check are still open — the seated party's own record."""
    return harness.q(
        f"SELECT count(*) FROM tables_session_assignment WHERE hub_id = '{HUB}' "
        f"AND session_id = '{session_id}' AND released_at IS NULL AND is_deleted = 0"
    )


def test_a_voided_sale_is_not_charged():
    print(
        "\n== an annulled PARTIAL charge stops counting and the party stays seated (tables#121) =="
    )
    seat(HUB, "sb", "t2a", "o-b")
    sale_completed(HUB, "sale-3", "o-b", 900, "a partial charge")
    sale_completed(HUB, "sale-4", "o-b", 1100, "another partial charge")
    # No `order.completed`: the order is still open in sales, the rest is still to be charged.
    sale_voided(HUB, "sale-4", "o-b", 1100, "the second sale is voided")
    check("the voided sale no longer counts", 900, paid("sb"))
    sale_voided(HUB, "sale-4", "o-b", 1100, "the relay redelivers the void")
    check("a redelivered void is applied once", 900, paid("sb"))
    # tables#121: a void does not end the order (sales leaves it open), so it cannot end the check.
    check("the check is still open", "active", harness.session_status("sb"))
    check("its table is still occupied", "occupied", harness.table_status("t2a"))
    check("its history segment is still open", "1", open_segments("sb"))

    sale_completed(HUB, "sale-11", "o-b", 1100, "the rest is charged again")
    command_ok(
        "the order ends: the check closes",
        listener("order.completed"),
        {"hub_id": HUB, "sender": "sales", "order_id": "o-b"},
        AT,
    )
    check("now the check is closed", "closed", harness.session_status("sb"))
    check("and its table is free", "available", harness.table_status("t2a"))
    check("the closed check says what it really charged", 2000, paid("sb"))


def test_voiding_a_sale_of_a_finished_check_leaves_the_next_party_alone():
    print(
        "\n== voiding the sale of a check already closed touches no seated party (tables#121) =="
    )
    seat(HUB, "sd", "t2a", "o-d")
    sale_completed(HUB, "sale-12", "o-d", 1800, "half of the check is charged")
    sale_completed(HUB, "sale-13", "o-d", 700, "the rest of the check is charged")
    command_ok(
        "the order ends: the check closes",
        listener("order.completed"),
        {"hub_id": HUB, "sender": "sales", "order_id": "o-d"},
        AT,
    )
    seat(HUB, "se", "t2a", "o-e")
    sale_voided(HUB, "sale-12", "o-d", 1800, "the old check's sale is voided")
    check("the old closed check no longer counts it", 700, paid("sd"))
    check("the old check stays closed", "closed", harness.session_status("sd"))
    check("the new party's check is still open", "active", harness.session_status("se"))
    check(
        "the table stays occupied by the new party",
        "occupied",
        harness.table_status("t2a"),
    )
    check("the new party's history segment is still open", "1", open_segments("se"))
    command_ok(
        "the new party pays and leaves",
        listener("order.completed"),
        {"hub_id": HUB, "sender": "sales", "order_id": "o-e"},
        AT,
    )

    # TABLES-F05: the manager can mark a table Occupied by hand, with no check on it. A void of a
    # check that ended long ago is not the floor's business: it must not free that table either.
    def mark_table(status: str) -> None:
        command_ok(
            f"the manager marks t2a {status} by hand",
            "tables.tables.update",
            {
                "hub_id": HUB,
                "table_id": "t2a",
                "number": "2",
                "name": "",
                "capacity": 4,
                "zone_id": "za",
                "shape": "square",
                "status": status,
                "is_active": 1,
            },
            AT,
        )

    mark_table("occupied")
    sale_voided(HUB, "sale-13", "o-d", 700, "the old check's other sale is voided")
    check("nothing live is left on the old check", None, paid("sd"))
    check(
        "the table the manager marked Occupied stays occupied",
        "occupied",
        harness.table_status("t2a"),
    )
    mark_table("available")


def test_sales_that_are_not_a_table_check_leave_no_trace():
    print(
        "\n== a counter sale (no order) or an order no table holds is not tables' business =="
    )
    sale_completed(HUB, "sale-5", None, 700, "a counter sale without order")
    sale_completed(HUB, "sale-6", "o-takeaway", 1200, "a takeaway order no table holds")
    # Merge leaves '' as «no order» on a check: an order-less counter sale must not match it.
    command_ok(
        "a check without an order ('' as merge leaves it)",
        "tables._session_open",
        {
            "hub_id": HUB,
            "session_id": "s-no-order",
            "table_id": "t2a",
            "guests_count": 2,
            "waiter_id": None,
            "notes": "",
            "order_id": "",
        },
        AT,
    )
    check(
        "the order-less check is really stored with ''",
        "1",
        harness.q(
            f"SELECT count(*) FROM tables_session "
            f"WHERE hub_id = '{HUB}' AND id = 's-no-order' AND order_id = ''"
        ),
    )
    sale_completed(HUB, "sale-10", "", 300, "a counter sale with an empty order id")
    ledger = harness.q(
        f"SELECT count(*) FROM tables_order_payment "
        f"WHERE hub_id = '{HUB}' AND sale_id IN ('sale-5', 'sale-6', 'sale-10')"
    )
    check("nothing is recorded for them", "0", ledger)


def test_one_hub_never_sees_the_money_of_another():
    print("\n== tenancy: the same order id on two hubs keeps two separate amounts ==")
    seat(HUB, "sc", "t1a", "o-shared")
    seat(OTHER_HUB, "sx", "t1x", "o-shared")
    sale_completed(HUB, "sale-7", "o-shared", 4000, "hub A charges its check")
    check("hub A's check shows its charge", 4000, paid("sc"))
    check(
        "hub B's check with the same order id shows nothing",
        None,
        paid("sx", OTHER_HUB),
    )

    sale_completed(OTHER_HUB, "sale-8", "o-shared", 600, "hub B charges its own")
    check("hub B sees only its own charge", 600, paid("sx", OTHER_HUB))
    check("hub A is untouched by hub B's charge", 4000, paid("sc"))

    sale_voided(
        OTHER_HUB, "sale-7", "o-shared", 4000, "hub B voids an id that is hub A's"
    )
    check("a void from another hub cannot touch hub A's sale", 4000, paid("sc"))

    sale_completed(
        OTHER_HUB, "sale-9", "o-a", 500, "hub B charges an order only hub A holds"
    )
    stray = harness.q(
        f"SELECT count(*) FROM tables_order_payment WHERE hub_id = '{OTHER_HUB}' AND sale_id = 'sale-9'"
    )
    check("hub B records nothing for a check that is not its own", "0", stray)


def test_the_owner_can_sort_checks_by_amount():
    print("\n== «biggest checks first»: the list engine sorts by paid_total ==")
    rows = harness.run_list_query(
        "tables.sessions.list",
        "paid_total",
        where="sub.paid_total IS NOT NULL",
        direction="DESC",
    )
    check(
        "closed and open checks with a charge, biggest first",
        [("sc", 4000), ("sa", 3850), ("sb", 2000)],
        [(r["id"], r["paid_total"]) for r in rows],
    )


def main() -> int:
    running = harness.subprocess.run(
        ["docker", "inspect", "-f", "{{.State.Running}}", harness.CONTAINER],
        capture_output=True,
        text=True,
    )
    if "true" not in running.stdout:
        harness.subprocess.run(
            ["docker", "start", harness.CONTAINER], capture_output=True
        )

    psql(["-c", f"DROP DATABASE IF EXISTS {DB} WITH (FORCE)"])
    psql(["-c", f"CREATE DATABASE {DB}"])
    try:
        for mig in sorted(
            (harness.MODULE_DIR / "migrations" / "postgres").glob("*.sql")
        ):
            psql([], db=DB, stdin=mig.read_text())
        seed(HUB, "a")
        seed(OTHER_HUB, "x")

        test_a_check_says_what_it_charged()
        test_a_voided_sale_is_not_charged()
        test_voiding_a_sale_of_a_finished_check_leaves_the_next_party_alone()
        test_sales_that_are_not_a_table_check_leave_no_trace()
        test_one_hub_never_sees_the_money_of_another()
        test_the_owner_can_sort_checks_by_amount()
    finally:
        psql(["-c", f"DROP DATABASE IF EXISTS {DB} WITH (FORCE)"])

    print()
    if failures:
        print(f"FAILED — {len(failures)} assertion(s):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("PASS — every check says what it charged (tables#96)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
