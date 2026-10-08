#!/usr/bin/env python3
"""The open-check life cycle (`tables.sessions.*`) against the REAL kernel — ported from the hub's
`tables_session_history_e2e.rs` stages 2-4 (ERPlora/hub#1264, contract «El Hub se CIERRA como
KERNEL» §5: the module proves its own behaviour; the hub keeps only the conformance of its
fixture).

ADR-0146 — the service session is the source of truth of the floor. `tables.sessions.open` /
`.close` / `.transfer` are Tier-2 handlers: they run inside the runtime, with the id the host
minted and the `reads` the dispatcher pre-loaded (the table's own row, so the SEATABLE guard sees
the truth and not whatever the screen believes). `.park` / `.restore` / `.link_order` are plain
declarative commands, but the promise under test is the SAME one — a session's status, its
table's status, and the account's junction to an order all move together, in one transaction — so
every test here talks to the one runtime that can prove it, through `POST /api/command` and
`POST /api/query`, never a hand-written harness:

  1. Opening a session marks its table OCCUPIED.
  2. Closing a session frees its table.
  3. Transferring closes the OLD segment and opens the next: the source table frees, the
     destination occupies — never both held at once (the exact defect the ADR describes).
  4. Charging the order linked to a table in FULL frees the table on its own — nobody has to
     remember to close the session by hand, which is the failure that motivated the ADR. `tables`
     listens for the ORDER's end (`order.completed`, emitted by `sales`), not the sale's, because
     a split-bill sale completes without the order doing so.
  5. A PARTIAL charge (split-bill, `keep_order_open`) leaves the table occupied: the rest of the
     account is still sitting there.
  6. Parking a check frees its table WITHOUT closing the account — the guest steps away, the
     table serves someone else, the account stays alive.
  7. Restoring a parked check seats it again, occupying whatever table it lands on (the same one
     or another) and freeing the one it parked from.
  8. A parked account holds NO table: the one it just left can seat a brand new party immediately.

Where the old e2e read `tables_session_assignment` directly (its `assignment_reason` /
`release_reason` per segment) there is no equivalent here on purpose: no query exposes that table
— it is internal bookkeeping the module's own reports read directly — so its CHECK constraints,
unique indexes and the backfill are pinned in `tests/session_history.postgres.test.py` instead.
What IS here is the half only a real runtime can prove: that a WASM handler's SQL chain actually
runs, mints its ids, and leaves the session/table PROJECTION exactly where the ADR says it must.

Usage: `erplora test <dir> --against-hub [dev|stable|sha256:…]` (module-toolkit#110). Never on its
own: without a runtime it fails, it does not skip.
"""

import sys

import hub_harness
from hub_harness import ONE, Hub, cash_method_id, key, wait_until


def create_table(hub: Hub) -> str:
    out = hub.run(
        "tables.tables.create",
        {
            "zone_id": None,
            "number": key("table"),
            "name": "",
            "capacity": 4,
            "position_x": 0,
            "position_y": 0,
            "width": 10,
            "height": 10,
            "shape": "square",
        },
    )
    table_id = (out.get("new_ids") or [None])[0]
    if not isinstance(table_id, str) or not table_id:
        raise AssertionError(f"tables.tables.create did not answer new_ids[0]: {out}")
    return table_id


def table_status(hub: Hub, table_id: str) -> str:
    rows = hub.query("tables.tables.get", {"table_id": table_id})
    return rows[0].get("status", "") if rows else ""


def session_on(hub: Hub, table_id: str) -> dict:
    """The single ACTIVE session on a table — every test here seats at most one party per table,
    so this is always exactly the one it just opened.

    Filtered by the list engine (`f_table_id`, `f_status`), never by scanning one page: the
    query pages at 50 rows sorted by `id` (random uuids), so on a hub that has already hosted a
    few runs the session this test just opened may simply not be on the page it scanned."""
    rows = hub.query(
        "tables.sessions.list", {"f_table_id": table_id, "f_status": "active"}
    )
    if len(rows) != 1:
        raise AssertionError(
            f"expected exactly one active session on table {table_id}, got {len(rows)}: {rows}"
        )
    return rows[0]


def session_by_id(hub: Hub, session_id: str) -> dict:
    """One session by id, whatever its status. `id` is not a list filter, so this reads the most
    recently opened sessions (newest first) — every session this battery looks up it opened
    itself moments ago, so it is always among them, however many runs the hub has hosted."""
    rows = hub.query(
        "tables.sessions.list", {"sort": "opened_at", "dir": "desc", "limit": 200}
    )
    return next((r for r in rows if r.get("id") == session_id), {})


def test_opening_a_session_occupies_its_table(hub: Hub) -> None:
    print("\n1 · opening a session marks its table OCCUPIED")
    tid = create_table(hub)
    hub.check("born available", table_status(hub, tid), "available")
    hub.run("tables.sessions.open", {"table_id": tid})
    hub.check("occupied by the party", table_status(hub, tid), "occupied")
    hub.check_true("it opens exactly one active session", bool(session_on(hub, tid)))


def test_closing_a_session_frees_its_table(hub: Hub) -> None:
    print("\n2 · closing a session frees its table")
    tid = create_table(hub)
    hub.run("tables.sessions.open", {"table_id": tid})
    sid = session_on(hub, tid)["id"]
    hub.run("tables.sessions.close", {"session_id": sid})
    hub.check("the table is free again", table_status(hub, tid), "available")
    hub.check(
        "the account is CLOSED, not deleted",
        session_by_id(hub, sid).get("status"),
        "closed",
    )


def test_transferring_moves_the_occupation_not_doubles_it(hub: Hub) -> None:
    print("\n3 · transferring closes one segment and opens the next — never both open")
    source = create_table(hub)
    target = create_table(hub)
    hub.run("tables.sessions.open", {"table_id": source})
    old_sid = session_on(hub, source)["id"]

    hub.run(
        "tables.sessions.transfer", {"session_id": old_sid, "target_table_id": target}
    )

    hub.check(
        "the old table is free for the next party",
        table_status(hub, source),
        "available",
    )
    hub.check("the new table holds the party", table_status(hub, target), "occupied")
    hub.check(
        "the OLD session is retired, not left active",
        session_by_id(hub, old_sid).get("status"),
        "transferred",
    )
    hub.check_true(
        "exactly one active session now, on the destination",
        bool(session_on(hub, target)),
    )


def test_charging_the_order_in_full_frees_the_table(hub: Hub, cash: str) -> None:
    print(
        "\n4 · charging the linked order in FULL frees the table on its own (no manual close)"
    )
    tid = create_table(hub)
    hub.run("tables.sessions.open", {"table_id": tid})
    sid = session_on(hub, tid)["id"]

    order_out = hub.run(
        "sales.order.open",
        {"items": [{"product_name": "Caña", "price": 250, "quantity": ONE}]},
    )
    oid = order_out["new_ids"][0]
    hub.run("tables.sessions.link_order", {"table_id": tid, "order_id": oid})
    hub.check(
        "linking the order does not free the table on its own",
        table_status(hub, tid),
        "occupied",
    )

    hub.run(
        "sales.complete_sale",
        {
            "idempotency_key": key("full-charge"),
            "payment_method_id": cash,
            "order_id": oid,
            "amount_tendered": 250,
            "tax_included": True,
            "items": [
                {
                    "product_name": "Caña",
                    "price": 250,
                    "quantity": ONE,
                    "tax_rate": 21.0,
                }
            ],
        },
    )

    # `order.completed` reaches `tables._session_close_by_order` through the outbox RELAY, a
    # background poll (~1 s, hub_harness.wait_until) — not something this request can force.
    freed = wait_until(
        lambda: table_status(hub, tid), accept=lambda s: s == "available"
    )
    hub.check(
        "the table frees itself: nobody closed the session by hand", freed, "available"
    )
    closed = wait_until(
        lambda: session_by_id(hub, sid).get("status"), accept=lambda s: s == "closed"
    )
    hub.check("its session is closed along with the order", closed, "closed")
    # tables#96: the CLOSED check says what it charged — the REAL `sale.completed` payload (cents)
    # through the relay into tables' own ledger, not a stub of it.
    charged = wait_until(
        lambda: session_by_id(hub, sid).get("paid_total"), accept=lambda v: v == 250
    )
    hub.check("the closed check carries what the sale charged (cents)", charged, 250)


def test_a_partial_charge_leaves_the_table_occupied(hub: Hub, cash: str) -> None:
    print(
        "\n5 · split-bill: a PARTIAL charge leaves the table occupied — the rest is still seated"
    )
    tid = create_table(hub)
    hub.run("tables.sessions.open", {"table_id": tid})

    order_out = hub.run(
        "sales.order.open",
        {
            "items": [
                {"product_name": "Caña", "price": 250, "quantity": ONE},
                {"product_name": "Ración", "price": 800, "quantity": ONE},
            ]
        },
    )
    oid = order_out["new_ids"][0]
    hub.run("tables.sessions.link_order", {"table_id": tid, "order_id": oid})

    hub.run(
        "sales.complete_sale",
        {
            "idempotency_key": key("partial-charge"),
            "payment_method_id": cash,
            "order_id": oid,
            "keep_order_open": True,
            "amount_tendered": 250,
            "tax_included": True,
            "items": [
                {
                    "product_name": "Caña",
                    "price": 250,
                    "quantity": ONE,
                    "tax_rate": 21.0,
                }
            ],
        },
    )

    hub.check(
        "the table stays occupied: the rest of the account is still there",
        table_status(hub, tid),
        "occupied",
    )
    # tables#96: a partial charge of a split bill already counts on the check that is still open.
    sid = session_on(hub, tid)["id"]
    charged = wait_until(
        lambda: session_by_id(hub, sid).get("paid_total"), accept=lambda v: v == 250
    )
    hub.check("the partial charge is on the still-open check", charged, 250)


def test_voiding_a_partial_charge_keeps_the_party_seated(hub: Hub, cash: str) -> None:
    print(
        "\n5b · voiding a PARTIAL charge leaves the table occupied with its check (tables#121)"
    )
    tid = create_table(hub)
    hub.run("tables.sessions.open", {"table_id": tid})
    sid = session_on(hub, tid)["id"]

    order_out = hub.run(
        "sales.order.open",
        {
            "items": [
                {"product_name": "Caña", "price": 250, "quantity": ONE},
                {"product_name": "Ración", "price": 800, "quantity": ONE},
            ]
        },
    )
    oid = order_out["new_ids"][0]
    hub.run("tables.sessions.link_order", {"table_id": tid, "order_id": oid})

    sale_out = hub.run(
        "sales.complete_sale",
        {
            "idempotency_key": key("partial-to-void"),
            # Like the till: the charge names the line it covers (ADR-0146 stage 5).
            "line_ids": [
                r["id"]
                for r in hub.query("sales.order.lines", {"order_id": oid})
                if r.get("product_name") == "Caña"
            ],
            "payment_method_id": cash,
            "order_id": oid,
            "keep_order_open": True,
            "amount_tendered": 250,
            "tax_included": True,
            "items": [
                {
                    "product_name": "Caña",
                    "price": 250,
                    "quantity": ONE,
                    "tax_rate": 21.0,
                }
            ],
        },
    )
    sale_id = sale_out["new_ids"][0]
    charged = wait_until(
        lambda: session_by_id(hub, sid).get("paid_total"), accept=lambda v: v == 250
    )
    hub.check("the partial charge is on the open check", charged, 250)

    hub.run("sales.void", {"sale_id": sale_id, "reason": "tables#121 battery"})

    # The void's listener drops the charge from the ledger in ONE transaction: once the amount is
    # gone, the listener has run, so what it did to the check and the table is already visible.
    uncharged = wait_until(
        lambda: session_by_id(hub, sid).get("paid_total"), accept=lambda v: v is None
    )
    hub.check("the voided charge no longer counts on the check", uncharged, None)
    hub.check(
        "the check is still open: the order is still open in sales",
        session_by_id(hub, sid).get("status"),
        "active",
    )
    hub.check(
        "the table stays occupied: the party is still sitting there",
        table_status(hub, tid),
        "occupied",
    )


def test_closing_by_hand_refuses_a_table_whose_bill_is_still_open(hub: Hub) -> None:
    print(
        "\n5c · closing a table by hand refuses while its bill is still open in sales; once the "
        "bill is deleted in sales it closes and frees the table (tables#124)"
    )
    tid = create_table(hub)
    hub.run("tables.sessions.open", {"table_id": tid})
    sid = session_on(hub, tid)["id"]
    order_out = hub.run(
        "sales.order.open",
        {"items": [{"product_name": "Caña", "price": 250, "quantity": ONE}]},
    )
    oid = order_out["new_ids"][0]
    hub.run("tables.sessions.link_order", {"table_id": tid, "order_id": oid})

    hub.refused(
        "closing by hand with the bill still open in sales",
        "tables.sessions.close",
        {"session_id": sid, "order_id": oid},
        "tables.session_bill_open",
    )
    # A caller that does not name the bill (or names another one) cannot slip past the guard.
    hub.refused(
        "closing by hand without naming the table's bill",
        "tables.sessions.close",
        {"session_id": sid},
        "tables.session_bill_mismatch",
    )
    hub.refused(
        "closing by hand naming a different bill",
        "tables.sessions.close",
        {"session_id": sid, "order_id": key("other-order")},
        "tables.session_bill_mismatch",
    )
    hub.check(
        "the table stays occupied with its open bill",
        table_status(hub, tid),
        "occupied",
    )
    hub.check(
        "the check stays open on its table",
        session_by_id(hub, sid).get("status"),
        "active",
    )

    # Deleting the bill in sales (TABLES-F20) is what lets the table go by hand.
    hub.run("sales.order.void", {"order_id": oid})
    hub.run("tables.sessions.close", {"session_id": sid, "order_id": oid})
    hub.check("the table is free again", table_status(hub, tid), "available")
    hub.check("the check is closed", session_by_id(hub, sid).get("status"), "closed")


def test_parking_frees_the_table_without_closing_the_account(hub: Hub) -> None:
    print("\n6 · parking frees the table WITHOUT closing the account (ADR-0146)")
    tid = create_table(hub)
    hub.run("tables.sessions.open", {"table_id": tid})
    sid = session_on(hub, tid)["id"]

    hub.run("tables.sessions.park", {"session_id": sid})

    hub.check(
        "the table is free for the next party", table_status(hub, tid), "available"
    )
    parked = session_by_id(hub, sid)
    hub.check("the account is PARKED, not closed", parked.get("status"), "parked")
    # `table_id` means the table it sits at NOW, and a parked check sits at none: NULL, not the
    # one it left. Otherwise every reader of the projection has to remember that "the table of
    # a parked check" is really "the last table it was seen at" (ADR-0146, the `006` migration).
    hub.check(
        "…and points at no table: `table_id` is NULL, not the one it left",
        parked.get("table_id"),
        None,
    )


def test_restoring_a_parked_check_occupies_its_new_table(hub: Hub) -> None:
    print(
        "\n7 · restoring a parked check seats it again, occupying the table it lands on"
    )
    first = create_table(hub)
    second = create_table(hub)
    hub.run("tables.sessions.open", {"table_id": first})
    sid = session_on(hub, first)["id"]
    hub.run("tables.sessions.park", {"session_id": sid})

    hub.run("tables.sessions.restore", {"session_id": sid, "table_id": second})

    restored = session_by_id(hub, sid)
    hub.check("the account is active again", restored.get("status"), "active")
    hub.check("…seated at the table it restored to", restored.get("table_id"), second)
    hub.check("that table is occupied", table_status(hub, second), "occupied")
    hub.check(
        "the table it parked from stays free", table_status(hub, first), "available"
    )


def test_a_parked_account_holds_no_table_at_all(hub: Hub) -> None:
    print(
        "\n8 · a parked account holds NO table: another party can sit at the one it just left"
    )
    # The e2e this is ported from asserted this as a raw COUNT on `tables_session_assignment`
    # (no live segment) — unreachable here on purpose (§ see the module's Postgres battery for
    # that schema-level invariant; no query exposes this table). The equivalent OBSERVABLE
    # promise: nothing about a parked account still holds its old table, so the very next party is
    # seated there immediately — `tables.sessions.open` would refuse `tables.table_not_available`
    # if anything still did.
    tid = create_table(hub)
    hub.run("tables.sessions.open", {"table_id": tid})
    sid = session_on(hub, tid)["id"]
    hub.run("tables.sessions.park", {"session_id": sid})
    hub.check(
        "the table shows free the instant it parks", table_status(hub, tid), "available"
    )
    hub.check(
        "the parked account itself claims no table",
        session_by_id(hub, sid).get("table_id"),
        None,
    )

    hub.run("tables.sessions.open", {"table_id": tid})
    new_sid = session_on(hub, tid)["id"]

    hub.check_true(
        "a brand new party is seated, with no trace of the parked one",
        new_sid != sid,
        new_sid,
    )
    hub.check(
        "and the table is occupied by them, not by nobody",
        table_status(hub, tid),
        "occupied",
    )


def split_table(hub: Hub, table_id: str) -> tuple[str, str]:
    """Seats a party and splits its check: two ACTIVE accounts on the same table (tables#12).
    Answers (original, new) — the ids the runtime minted, not a guess at which one is which."""
    hub.run("tables.sessions.open", {"table_id": table_id})
    original = session_on(hub, table_id)["id"]
    out = hub.run("tables.sessions.split", {"session_id": original})
    new = (out.get("new_ids") or [None])[0]
    if not isinstance(new, str) or not new:
        raise AssertionError(f"tables.sessions.split did not answer new_ids[0]: {out}")
    return original, new


def test_transferring_one_half_of_a_split_table_keeps_it_occupied(hub: Hub) -> None:
    print(
        "\n9 · tables#118: moving ONE account of a split table leaves the other one seated — "
        "the source table stays occupied"
    )
    source = create_table(hub)
    target = create_table(hub)
    moved, stays = split_table(hub, source)

    hub.run(
        "tables.sessions.transfer", {"session_id": moved, "target_table_id": target}
    )

    hub.check(
        "the source table is still occupied: the other account is sitting there",
        table_status(hub, source),
        "occupied",
    )
    hub.check(
        "the account left behind is still open",
        session_by_id(hub, stays).get("status"),
        "active",
    )
    hub.check(
        "the destination holds the moved account", table_status(hub, target), "occupied"
    )


def test_merging_one_half_of_a_split_table_keeps_it_occupied(hub: Hub) -> None:
    print(
        "\n10 · tables#118: merging ONE account of a split table into another table leaves the "
        "other one seated — the source table stays occupied"
    )
    source = create_table(hub)
    target = create_table(hub)
    merged, stays = split_table(hub, source)
    hub.run("tables.sessions.open", {"table_id": target})

    hub.run("tables.sessions.merge", {"session_id": merged, "target_table_id": target})

    hub.check(
        "the source table is still occupied: the other account is sitting there",
        table_status(hub, source),
        "occupied",
    )
    hub.check(
        "the account left behind is still open",
        session_by_id(hub, stays).get("status"),
        "active",
    )
    hub.check(
        "the merged account is retired",
        session_by_id(hub, merged).get("status"),
        "merged",
    )


def test_moving_the_only_account_still_frees_the_table(hub: Hub) -> None:
    print(
        "\n11 · tables#118 control: merging the ONLY account of a table still frees it "
        "(the new guard does not keep empty tables occupied)"
    )
    source = create_table(hub)
    target = create_table(hub)
    hub.run("tables.sessions.open", {"table_id": source})
    sid = session_on(hub, source)["id"]
    hub.run("tables.sessions.open", {"table_id": target})

    hub.run("tables.sessions.merge", {"session_id": sid, "target_table_id": target})

    hub.check("the emptied table is free again", table_status(hub, source), "available")


def main() -> int:
    hub = Hub("session_history.hub")
    print(
        "Hub battery · open-check life cycle (hub#1264 ← tables_session_history_e2e.rs) · "
        f"{hub_harness.BASE} · hub {hub.hub_id} · user {hub.user}"
    )
    cash = cash_method_id(hub)
    test_opening_a_session_occupies_its_table(hub)
    test_closing_a_session_frees_its_table(hub)
    test_transferring_moves_the_occupation_not_doubles_it(hub)
    test_charging_the_order_in_full_frees_the_table(hub, cash)
    test_a_partial_charge_leaves_the_table_occupied(hub, cash)
    test_voiding_a_partial_charge_keeps_the_party_seated(hub, cash)
    test_closing_by_hand_refuses_a_table_whose_bill_is_still_open(hub)
    test_parking_frees_the_table_without_closing_the_account(hub)
    test_restoring_a_parked_check_occupies_its_new_table(hub)
    test_a_parked_account_holds_no_table_at_all(hub)
    test_transferring_one_half_of_a_split_table_keeps_it_occupied(hub)
    test_merging_one_half_of_a_split_table_keeps_it_occupied(hub)
    test_moving_the_only_account_still_frees_the_table(hub)
    return hub.finish(
        "the open-check life cycle behaves as ADR-0146 promises, against the real kernel"
    )


if __name__ == "__main__":
    sys.exit(main())
