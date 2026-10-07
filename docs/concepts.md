# Tables — Concepts

The things people get wrong on their first day.

## A session is a check, not a table and not a booking

Three things that look alike and are not:

- **A table** is furniture. It has a number, a capacity and a position on the plan.
- **A session** is one party's stay — in practice, **one check**. It has guests, a waiter, an opening
  and a closing time, and an order.
- **A hold** is a table set aside for a booking. **Nobody has sat down.** It is not a session and it
  does not have an order.

## One table can have several live checks

Since split-bill exists, a table may hold **more than one active session at a time**. That is a
divided check, not a bug.

The invariant that does hold is the other one: **an order belongs to exactly one session.**
Transferring and merging **move** the order reference; they never duplicate it. That is why a
transfer makes the origin release its order before the destination takes it.

## Splitting and merging: who does what

Tables owns the room; `sales` owns the lines and the money. So the work is divided:

| Action | Tables does | Sales does |
|---|---|---|
| **Split** | Opens the second live session, linked to the first, **with no order**; the POS keeps the new one in front, and charging or deleting a check closes only its own session | Creates the new order and attaches it to that session |
| **Merge, one order** | Frees the source table (unless another check is still seated there); the survivor **adopts** the order | Nothing |
| **Merge, both have orders** | Frees the room and reports **both** order references | Moves the lines from one order to the other |

Tables cannot merge two orders because it does not know the lines. This is not a limitation to work
around — asking it to would mean it had to understand prices and kitchen rounds.

## Parking is not closing

- **Park** — the party is gone from the table but the bill is still open. The table is freed, the
  session survives with no table, the order is untouched. It can be restored to any free table.
- **Close** — the check is finished. The table is freed and the session ends.

Parking is how a bar keeps a tab open while the customer moves to the terrace, and how a check
survives while the table is reassigned.

## Charging part of a bill does not free the table

The table is freed when the **order** completes, not when money is taken. A partial payment leaves
the order open, so no `order.completed` is emitted and the party keeps its table. That is the correct
behaviour, and it is why the split-bill flow does not eject people who paid first.

Voiding a sale also closes the session and frees the table.

## What a check charged comes from `sales`' events

Tables never reads `sales`' data. It keeps its own ledger, one line per sale charged on an order a
check of this hub holds, fed by `sale.completed` (every charge, the partial ones of a split bill too)
and `sale.voided` (the line stops counting). A sale redelivered by the outbox is recorded once. A
counter sale with no order, or an order no table holds (takeaway), leaves no line.

The ledger starts the day this version is installed: checks closed before it read «—». Refunds
(`sale.refunded`) do not subtract — the column says what was **charged**, as Toast's closed checks do.

## Seating a reserved table is normal, and it consumes the hold

A `reserved` table is not blocked. When the booked party arrives you seat them exactly as usual, and
the hold is marked **consumed** in the same step. Opening, transferring, splitting and restoring all
do this.

Had `reserved` blocked seating, painting bookings on the plan would have broken the till.

## A hold expires by itself; it does not sit there forever

Every 15 minutes, holds past their window are expired and their tables return to the floor **unless
somebody is sitting there**. A no-show cannot kill a table for the rest of the service.

The four hold states are worth distinguishing because they are different facts: `consumed` (they
came), `released` (it was cancelled), `expired` (nobody came), `held` (still waiting).

## The reservation link is a handoff, not a join

Tables does **not** read the reservations module, and cannot: it has no dependency on it and must
work when it is not installed. Whoever books a table calls the hold command with **its own opaque
reference**, and Tables decides what the plan shows.

That reference is also the idempotency key, so a repeated handoff cannot create two holds for one
booking.

## A hold keeps a name only while it is live

A hold copies the guest's name from the booking so the plan can say who the table is for, and the
customer it belongs to (empty for a walk-in or a hold made by hand). Two things follow:

- **When a hold ends** (consumed, released, unassigned or expired) its name is emptied: no screen
  shows a finished hold, so there is no reason to keep it.
- **When a customer's personal data is erased** in Customers (`customer.anonymized`), every hold of
  that customer loses its name — live, finished and deleted ones alike. The table stays reserved,
  with its time and party size, and the plan reads **"Deleted customer"** where the name was.

A hold without a customer (and a live one made before this rule) cannot be found by customer: it
keeps its name until it ends.

## Capacity is a warning, not a rule

Seating six people at a table for four is allowed and always was. The screen tells you; nothing
refuses. Restaurants do this constantly and software that argues about it gets switched off.

## Destructive actions are guarded, and refused with a reason

| Action | Refused when |
|---|---|
| Delete a zone | It still has active tables |
| Delete a table | It has an active session |
| Delete a session | It is still active — close it first |
| Open a session | The table is not available |
| Transfer | The origin is not active, or the destination is not free or reserved |

Deletion is always a **soft delete**: rows are marked, not erased, so the history of who sat where
survives.

## Every stay leaves a permanent trail

Beyond the session, each stint at a table is recorded append-only: when it was assigned, when it was
released, and why. That history is the source of truth for where a check has been; the session itself
only tells you where it is **now**.

## The table on a session is optional

A parked check has **no table**. That is why the table reference can be empty — it means "this check
exists but is not seated right now", not "data is missing".
