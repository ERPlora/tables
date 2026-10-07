#!/usr/bin/env python3
"""pm#637 (tables layer) — when a customer's personal data is erased, the floor plan forgets her too.

`customers.anonymize` is the platform's GDPR erasure (art. 17, customers#11). It rewrites the sheet
and publishes `customer.anonymized` with `{customer_id, reason}` (+ the relay's `hub_id`). `tables`
COPIES the guest's name into its own hold when `reservations` confirms a booking with a table
(`tables_table_hold.label`, painted on the plan and in «Choose table»). Unless this module listens,
that name outlives the erasure (TABLES-F31).

WHAT IS PROVEN HERE, against a REAL Postgres:

  1. The manifest listens to `customer.anonymized` with an internal, transactional command that
     emits nothing, has no `schema` (the payload is the emitter's) and no `expect_rows` (a customer
     who never booked a table is the normal case), gated by a permission the module declares.
  2. The hold keeps WHO it belongs to: the `customer_id` the reservation event already carries is
     stored with the hold, and the plan query hands it to the screen next to the name.
  3. Erasure: every hold of that customer — live, deleted, already finished — loses its name; what
     the business keeps (table, window, party size, status, reservation reference, customer id) is
     untouched, and the row is stamped by the eraser.
  4. IDEMPOTENCE — the outbox is at-least-once. A hold that is already nameless is not re-stamped,
     and the second delivery changes nothing.
  5. An event with an empty id touches nothing (a hold WITHOUT a sheet keeps its name), nor do the
     holds of other customers.
  6. TENANCY — a hold of the hub next door carrying the same opaque customer id is NOT touched.
  7. MINIMISATION — a hold that is over (cancelled, no-show, unassigned, released by hand, expired,
     spent by seating) keeps no name: no screen reads it any more, so it is not kept. Moving a live
     hold to another table keeps it.
  8. The upgrade: holds that were already over before this version lose their name; live ones keep
     it (the plan still paints them) with an empty `customer_id`.

Runs the SQL the way the runtime does (`:name` bound, one transaction per command) through the
runtime-in-miniature of `floor.postgres.test.py`. Uses `erplora-test-pg-5433`; scratch DB dropped at
the end.
Usage: tests/customer_erasure.postgres.test.py   (exit 0 = green)
"""

import importlib.util
import pathlib
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("floor", HERE / "floor.postgres.test.py")
floor = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(floor)

floor.DB = f"tables_erasure_test_{floor.os.getpid()}"
HUB = floor.HUB
OTHER_HUB = "hub-other"
q, check, command_ok, psql, literal = (
    floor.q,
    floor.check,
    floor.command_ok,
    floor.psql,
    floor.literal,
)

EVENT = "customer.anonymized"
LISTENER = "tables._on_customer_anonymized"
STATUS_EVENT = "reservations.reservation.status_changed"
UPDATED_EVENT = "reservations.reservation.updated"
ERASED = "cust-ana"
SOMEONE = "cust-luis"
CREATED = "2026-10-01T09:00:00+00:00"
NOW = "2026-10-07T10:00:00+00:00"
LATER = "2026-10-07T11:00:00+00:00"
# The first migration of this change: everything before it is what a hub already runs.
UPGRADE_FROM = "013"


def listener_for(event: str) -> str:
    return (
        floor.MANIFEST.get("events", {}).get("listen", {}).get(event, {}).get("command")
        or ""
    )


def erase(customer_id, now=NOW, hub=HUB):
    """Deliver `customer.anonymized` the way the outbox relay does: the payload IS the emitter's
    params, and the runtime adds `hub_id`, `current_user_id` and `now`."""
    return command_ok(
        f"customer.anonymized for [{customer_id}] in {hub}",
        LISTENER,
        {
            "customer_id": customer_id,
            "reason": "GDPR request",
            "hub_id": hub,
            "current_user_id": "user-eraser",
        },
        now,
    )


def status_event(status: str, table_id, reservation_id, **extra) -> dict:
    """The payload `reservations` emits, enriched by its handler from the reservation row."""
    p = {
        "sender": "reservations",
        "reservation_id": reservation_id,
        "status": status,
        "previous_status": "pending",
        "cancellation_reason": None,
        "table_id": table_id,
        "date": "2026-10-20",
        "time": "21:00:00",
        "duration_minutes": 90,
        "party_size": 4,
        "guest_name": "Ana García",
        "customer_id": ERASED,
    }
    p.update(extra)
    return p


def hold(hid, hub, customer_id, label, table_id="t8", status="held", deleted=0):
    psql(
        [
            "-c",
            "INSERT INTO tables_table_hold (id, hub_id, table_id, source, source_ref, held_from, "
            "held_until, party_size, label, status, is_deleted, customer_id, created_by, updated_by, "
            f"created_at, updated_at) VALUES ({literal(hid)}, {literal(hub)}, {literal(table_id)}, "
            f"'reservations', {literal('r-' + hid)}, '2026-10-20T21:00:00', '2026-10-20T22:30:00', 4, "
            f"{literal(label)}, {literal(status)}, {deleted}, {literal(customer_id)}, 'u-host', "
            f"'u-host', '{CREATED}', '{CREATED}')",
        ],
        db=floor.DB,
    )


def row(hid, hub=HUB) -> dict:
    out = q(
        "SELECT label || '|' || COALESCE(updated_by, '') || '|' || COALESCE(updated_at, '') || '|' || "
        "table_id || '|' || held_from || '|' || held_until || '|' || party_size || '|' || status || '|' || "
        "is_deleted || '|' || source_ref || '|' || customer_id "
        f"FROM tables_table_hold WHERE id = {literal(hid)} AND hub_id = {literal(hub)}"
    )
    keys = [
        "label",
        "updated_by",
        "updated_at",
        "table_id",
        "held_from",
        "held_until",
        "party_size",
        "status",
        "is_deleted",
        "source_ref",
        "customer_id",
    ]
    parts = out.split("|") if out and not out.startswith("<") else []
    return dict(zip(keys, parts)) if len(parts) == len(keys) else {"raw": out}


def by_ref(ref: str) -> dict:
    hid = q(
        f"SELECT id FROM tables_table_hold WHERE hub_id = '{HUB}' AND source = 'reservations' "
        f"AND source_ref = {literal(ref)}"
    )
    return row(hid) if hid and not hid.startswith("<") else {"raw": hid}


def plan_row(table_id: str) -> dict:
    rows = [r for r in floor.run_query("tables.tables.list", {}) if r["id"] == table_id]
    return rows[0] if rows else {}


# ── 1 ────────────────────────────────────────────────────────────────────────────────────


def test_manifest_listens():
    print("\n== 1. the manifest listens to customer.anonymized ==")
    check(f"tables listens to {EVENT}", LISTENER, listener_for(EVENT))
    cmd = floor.MANIFEST["commands"].get(LISTENER) or {}
    check("the listener is declared", True, bool(cmd))
    check(
        "it is internal (no public door)",
        True,
        LISTENER.split(".", 1)[1].startswith("_"),
    )
    check("it runs in one transaction", True, cmd.get("transaction"))
    check("no schema (the payload is the emitter's)", None, cmd.get("schema"))
    check("no expect_rows (no hold for her is normal)", None, cmd.get("expect_rows"))
    check("it emits nothing", [], cmd.get("emit", []))
    check(
        "its permission is one the module declares",
        True,
        cmd.get("permission") in floor.MANIFEST.get("permissions", []),
    )
    check("it runs SQL", True, bool(cmd.get("sql")))


# ── 2 ────────────────────────────────────────────────────────────────────────────────────


def test_hold_keeps_its_customer():
    print("\n== 2. the hold of a confirmed reservation keeps WHO it belongs to ==")
    listener = listener_for(STATUS_EVENT)
    command_ok(
        "Ana's reservation is confirmed with table 2",
        listener,
        status_event("confirmed", "t2", "r-ana"),
        "2026-10-07T09:00:00+00:00",
    )
    held = by_ref("r-ana")
    check("the hold carries her name", "Ana García", held.get("label"))
    check("the hold carries her customer id", ERASED, held.get("customer_id"))

    command_ok(
        "a walk-in reservation without a sheet, table 5",
        listener,
        status_event("confirmed", "t5", "r-walk", guest_name="Pepe", customer_id=None),
        "2026-10-07T09:01:00+00:00",
    )
    check("no sheet → empty customer id", "", by_ref("r-walk").get("customer_id"))

    # The walk-in is linked to a sheet afterwards and confirmed again: the same hold (same
    # reservation) has to learn whose it is, or her erasure would never find it.
    command_ok(
        "the walk-in is linked to a sheet and confirmed again",
        listener,
        status_event(
            "confirmed", "t5", "r-walk", guest_name="Pepe", customer_id="cust-pepe"
        ),
        "2026-10-07T09:02:00+00:00",
    )
    check(
        "a repeated confirmation re-points the hold to the sheet",
        "cust-pepe",
        by_ref("r-walk").get("customer_id"),
    )

    plan = plan_row("t2")
    check("the plan paints her name", "Ana García", plan.get("reserved_for"))
    check(
        "the plan hands her customer id over", ERASED, plan.get("reserved_customer_id")
    )
    check(
        "a table without a hold has no customer id",
        None,
        plan_row("t8").get("reserved_customer_id"),
    )


# ── 3-6 ──────────────────────────────────────────────────────────────────────────────────


def test_erasure():
    print("\n== 3. erasing the customer empties every hold of hers ==")
    hold("h-live", HUB, ERASED, "Ana García", table_id="t1")
    hold("h-deleted", HUB, ERASED, "Ana García", deleted=1)
    hold("h-over", HUB, ERASED, "Ana García", status="released")
    hold("h-nameless", HUB, ERASED, "")
    hold("h-someone", HUB, SOMEONE, "Luis Pérez")
    hold("h-nosheet", HUB, "", "Walk-in Pepe")
    hold("h-hub-b", OTHER_HUB, ERASED, "Ana García (B)")
    # The hold that the plan paints on table 1 (the only one on that table).
    q(
        f"UPDATE tables_table SET status = 'reserved' WHERE id = 't1' AND hub_id = '{HUB}'"
    )

    print("\n== 5a. an event with an empty id touches nothing ==")
    erase("")
    check(
        "a hold without a sheet keeps its name",
        "Walk-in Pepe",
        row("h-nosheet").get("label"),
    )
    check(
        "her live hold is untouched by an empty id",
        "Ana García",
        row("h-live").get("label"),
    )
    check("…and not stamped", CREATED, row("h-live").get("updated_at"))

    before = row("h-live")
    erase(ERASED)
    for hid in ("h-live", "h-deleted", "h-over"):
        after = row(hid)
        check(f"{hid}: the name is gone", "", after.get("label"))
        check(f"{hid}: stamped by the eraser", "user-eraser", after.get("updated_by"))
        check(f"{hid}: stamped at the erasure", NOW, after.get("updated_at"))
    after = row("h-live")
    for key in (
        "table_id",
        "held_from",
        "held_until",
        "party_size",
        "status",
        "is_deleted",
        "source_ref",
        "customer_id",
    ):
        check(f"h-live keeps {key}", before.get(key), after.get(key))
    check(
        "the reservation's own hold (table 2) is emptied",
        "",
        by_ref("r-ana").get("label"),
    )

    print("\n== 4. idempotence ==")
    check(
        "an already nameless hold is not re-stamped",
        CREATED,
        row("h-nameless").get("updated_at"),
    )
    erase(ERASED, now=LATER)
    check("the second delivery does not re-stamp", NOW, row("h-live").get("updated_at"))

    print("\n== 5b/6. other customers, holds without a sheet and the hub next door ==")
    check(
        "someone else's hold keeps the name",
        "Luis Pérez",
        row("h-someone").get("label"),
    )
    check("…and is not stamped", CREATED, row("h-someone").get("updated_at"))
    check(
        "the hold without a sheet keeps its name",
        "Walk-in Pepe",
        row("h-nosheet").get("label"),
    )
    check(
        "the same id in another hub is not touched",
        "Ana García (B)",
        row("h-hub-b", OTHER_HUB).get("label"),
    )
    check("…and not stamped", CREATED, row("h-hub-b", OTHER_HUB).get("updated_at"))

    print("\n== 3b. the plan after the erasure ==")
    plan = plan_row("t1")
    check("table 1 is still reserved", "reserved", floor.table_status("t1"))
    check("the plan has no name for her any more", "", plan.get("reserved_for"))
    check(
        "…but still knows it was a customer's hold",
        ERASED,
        plan.get("reserved_customer_id"),
    )
    check("…and still shows the time", "2026-10-20T21:00:00", plan.get("reserved_from"))


# ── 7 ────────────────────────────────────────────────────────────────────────────────────


def test_a_finished_hold_keeps_no_name():
    print("\n== 7. a hold that is over keeps no name ==")
    status = listener_for(STATUS_EVENT)
    updated = listener_for(UPDATED_EVENT)
    at = "2026-10-07T12:00:00+00:00"

    for ref, end in (("r-cancel", "cancelled"), ("r-noshow", "no_show")):
        command_ok(
            f"{ref} confirmed on table 5",
            status,
            status_event("confirmed", "t5", ref),
            at,
        )
        check(
            f"{ref}: the live hold carries the name",
            "Ana García",
            by_ref(ref).get("label"),
        )
        command_ok(
            f"{ref} → {end}",
            status,
            status_event(end, "t5", ref, previous_status="confirmed"),
            at,
        )
        check(f"{ref}: released", "released", by_ref(ref).get("status"))
        check(f"{ref}: the released hold keeps no name", "", by_ref(ref).get("label"))

    command_ok(
        "r-move confirmed on table 5",
        status,
        status_event("confirmed", "t5", "r-move"),
        at,
    )
    command_ok(
        "r-move moved to table 8",
        updated,
        {"reservation_id": "r-move", "table_id": "t8"},
        at,
    )
    check(
        "a moved live hold keeps the name", "Ana García", by_ref("r-move").get("label")
    )
    command_ok(
        "r-move loses its table",
        updated,
        {"reservation_id": "r-move", "table_id": ""},
        at,
    )
    check("r-move: released", "released", by_ref("r-move").get("status"))
    check(
        "r-move: the unassigned hold keeps no name", "", by_ref("r-move").get("label")
    )

    manual = {
        "table_id": "t8",
        "source": "assistant",
        "source_ref": "pedro-2100",
        "held_from": "2026-10-20T21:00:00",
        "held_until": "2026-10-20T23:00:00",
        "party_size": 4,
        "label": "Pedro",
    }
    command_ok("a hold by hand for Pedro", "tables.tables.hold", manual, at)
    command_ok(
        "released by hand",
        "tables.tables.release_hold",
        {"source": "assistant", "source_ref": "pedro-2100"},
        at,
    )
    check(
        "the hold released by hand keeps no name",
        "",
        q(
            f"SELECT label FROM tables_table_hold WHERE hub_id = '{HUB}' AND source = 'assistant' "
            "AND source_ref = 'pedro-2100'"
        ),
    )

    command_ok(
        "r-expire confirmed on table 8",
        status,
        status_event("confirmed", "t8", "r-expire", date="2026-10-01"),
        at,
    )
    command_ok(
        "the sweep runs after its window",
        "tables.tables.expire_holds",
        {},
        "2026-10-02T00:00:00",
    )
    check("r-expire: expired", "expired", by_ref("r-expire").get("status"))
    check(
        "r-expire: the expired hold keeps no name", "", by_ref("r-expire").get("label")
    )

    command_ok(
        "r-seat confirmed on table 2",
        status,
        status_event("confirmed", "t2", "r-seat"),
        at,
    )
    command_ok(
        "the party sits at table 2",
        "tables._session_open",
        {
            "session_id": "s-seat",
            "table_id": "t2",
            "guests_count": 4,
            "waiter_id": None,
            "notes": "",
            "order_id": None,
        },
        at,
    )
    check("r-seat: consumed", "consumed", by_ref("r-seat").get("status"))
    check("r-seat: the spent hold keeps no name", "", by_ref("r-seat").get("label"))


# ── 8 ────────────────────────────────────────────────────────────────────────────────────


def seed_before_upgrade():
    """Holds written by the previous version: no `customer_id` column yet."""
    for hid, status in (
        ("old-live", "held"),
        ("old-released", "released"),
        ("old-expired", "expired"),
        ("old-consumed", "consumed"),
    ):
        psql(
            [
                "-c",
                "INSERT INTO tables_table_hold (id, hub_id, table_id, source, source_ref, held_from, "
                "held_until, party_size, label, status, is_deleted, created_at, updated_at) VALUES "
                f"({literal(hid)}, '{HUB}', 't1', 'reservations', {literal('r-' + hid)}, "
                f"'2026-09-01T21:00:00', '2026-09-01T22:00:00', 2, 'Marta Old', {literal(status)}, 0, "
                f"'{CREATED}', '{CREATED}')",
            ],
            db=floor.DB,
        )


def test_upgrade():
    print("\n== 8. upgrading: finished holds forget the name, live ones keep it ==")
    check("a live hold keeps its name", "Marta Old", row("old-live").get("label"))
    check("…with an empty customer id", "", row("old-live").get("customer_id"))
    for hid in ("old-released", "old-expired", "old-consumed"):
        check(f"{hid}: the name is gone", "", row(hid).get("label"))


def apply(migrations):
    for rel in migrations:
        psql([], db=floor.DB, stdin=(floor.MODULE_DIR / rel).read_text())


def main() -> int:
    DB = floor.DB
    running = subprocess.run(
        ["docker", "inspect", "-f", "{{.State.Running}}", floor.CONTAINER],
        capture_output=True,
        text=True,
    )
    if "true" not in running.stdout:
        subprocess.run(["docker", "start", floor.CONTAINER], capture_output=True)

    entries = [
        e if isinstance(e, str) else e["file"]
        for e in floor.MANIFEST["migrations"]["postgres"]
    ]
    before = [e for e in entries if pathlib.Path(e).name < UPGRADE_FROM]
    after = [e for e in entries if pathlib.Path(e).name >= UPGRADE_FROM]

    psql(["-c", f"DROP DATABASE IF EXISTS {DB} WITH (FORCE)"])
    psql(["-c", f"CREATE DATABASE {DB}"])
    try:
        apply(before)
        seed_before_upgrade()
        apply(after)
        test_upgrade()
        psql(["-c", "DELETE FROM tables_table_hold"], db=DB)
        floor.seed_floor()
        test_manifest_listens()
        if listener_for(EVENT):
            test_hold_keeps_its_customer()
            test_erasure()
        test_a_finished_hold_keeps_no_name()
    finally:
        psql(["-c", f"DROP DATABASE IF EXISTS {DB} WITH (FORCE)"])

    print()
    if floor.failures:
        print(f"FAILED — {len(floor.failures)} assertion(s):")
        for f in floor.failures:
            print(f"  - {f}")
        return 1
    print("PASS — erasing a customer empties her holds on the floor plan (pm#637)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
