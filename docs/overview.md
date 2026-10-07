# Tables — Overview

## What this module does

Tables is the floor plan of a restaurant. It owns the **zones** of the room, the **tables** in them
with their position on a canvas, and the **sessions** — a session is one party seated at one table,
which is to say one check. It handles everything that happens to a check on the floor: open it, park
it, move it to another table, merge two of them, split it in two, and close it when the bill is paid.

It is the **authority on occupancy**: what is free, what is taken, what is held for a reservation.

## What this module does NOT do

- **It does not know what anyone ordered.** Lines, quantities and amounts belong to `sales`. This
  module keeps only an opaque reference to the order.
- **It does not take money.** Closing a session frees the table; charging is a separate act.
- **It does not merge two checks that both have orders.** It can free the table, but joining the
  lines is something only `sales` can do.
- **It does not manage reservations.** A confirmed booking reaches the floor plan as a **hold**;
  making and confirming bookings belongs to `reservations`.
- **It does not enforce capacity.** Seating more guests than a table's capacity is allowed; it is a
  warning in the screen, not a refusal.

## Modules it connects to

**Depends on nothing.** Every link outward is an opaque reference or an event, so the dining room can
be installed without dragging anything with it.

**Events it emits**

| Event | When |
|---|---|
| `tables.zone.created` / `.updated` / `.deleted` | zones change |
| `tables.table.created` / `.updated` / `.deleted` | tables change |
| `tables.session.opened` / `.closed` | a party is seated or leaves |
| `tables.session.transferred` | a check moves to another table |
| `tables.session.merged` | two tables become one |
| `tables.session.split` | a check is split in two |
| `tables.session.parked` / `.restored` | a check leaves the floor and comes back |
| `tables.session.deleted` | a session is removed |
| `tables.table.held` | a table is held for a booking |
| `tables.table.hold_released` | a hold is released or expires |

**Events it listens to**

| Event | Runs | Effect |
|---|---|---|
| `order.completed` (from `sales`) | `tables._session_close_by_order` | Closes the session and frees the table |
| `sale.completed` (from `sales`) | `tables._order_record_sale` | Records what the sale charged on its check |
| `sale.voided` (from `sales`) | `tables._order_sale_voided` | The voided sale stops counting on its check; the check stays open and the table occupied, because the order is still open in `sales` |
| `customer.anonymized` (from `customers`) | `tables._on_customer_anonymized` | Empties the guest name of every hold of that customer; the table stays reserved |

Both work through the opaque order reference. Note that **charging part of a bill does not emit
`order.completed`**, so a partial payment correctly leaves the table occupied — and so does voiding
that partial payment: the rest of the check is still sitting there.

**It fills a slot in the till.** The sell screen gets a **table selector** — a modal with a tab per
zone. Pick a table and the check is associated with it; when the check materialises, the order id is
stored on the session. Turning Tables off removes only that selector; Kitchen, Customers and the
checks themselves keep working.

## A scheduled task runs every 15 minutes

`expire_table_holds` sweeps holds whose window has passed and returns those tables to the floor. This
exists so a no-show cannot leave a table dead for the rest of the service.

## The vocabulary

| Concept | Values |
|---|---|
| **Table status** | `available`, `occupied`, `reserved`, `blocked` |
| **Table shape** | `square`, `round`, `rectangle` |
| **Session status** | `active`, `closed`, `transferred`, `merged`, `parked` |
| **Hold status** | `held`, `consumed`, `released`, `expired` |
