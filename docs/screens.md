# Tables — Screens

The module contributes five tabs to the hub navigation: **Floor Plan**, **Zones**, **Tables**,
**Sessions** and **Settings**. It also injects a table selector into the sell screen of the POS.

## Floor Plan

The visual editor of the room. Tables are boxes on a canvas, grouped by zone tabs.

- **Drag a table** to reposition it; the new position and size are saved immediately.
- **Add a zone** or **add a table** from here.
- The plan shows each table's live status by colour, including tables **held** for a booking.

Viewing needs `tables.view_table`; moving a table needs `tables.change_table`.

## Zones

The areas of your establishment — dining room, terrace, bar, VIP (`tables.zones.list`, 50 rows per
page). Requires `tables.view_zone`. Sorted by name.

A zone has a name, a description, a colour, a sort order and an active flag.

### Create a zone

1. Open **Zones**, add one, give it a name.
2. Optionally set its colour and where it appears in the order of tabs.

Requires `tables.add_zone`.

### Delete a zone

Only possible if it has **no active tables**. Move or delete the tables first. Requires
`tables.delete_zone` — **admin only**.

## Tables

Every table with its current status and zone (`tables.tables.list`, 50 rows per page). Requires
`tables.view_table`. Sorted by name.

- **Search** by number or name.
- **Sort and filter** by number, name, capacity, shape, status, active flag, position, size or zone.

Each row also carries the **live hold**, if there is one: who it is held for, from when until when,
and for how many people.

### Create a table

1. Open **Tables** and add one.
2. Give it a **number**, and optionally a name.
3. Set its **capacity** (at least 1, 4 by default), its **shape** (`square`, `round` or
   `rectangle`) and the zone it belongs to.
4. Save.

Requires `tables.add_table`.

### Create many tables at once

Bulk creation generates up to **100 tables** in a zone: give a prefix and a starting number, and they
are numbered consecutively and laid out on a grid. If the target zone does not exist, the whole batch
is rolled back. Requires `tables.add_table`.

### Delete a table

Refused while it has an **active session**. Close the check first. Requires `tables.delete_table` —
**admin only**.

## Sessions

The checks, current and historical (`tables.sessions.list`, 50 rows per page). Requires
`tables.view_tablesession`.

- **Search** by table number.
- **Filter** by table, guests, status, waiter, opening or closing time, or notes.

Each row shows its order reference and, for a split check, which session it was split from — so the
till can list a table's **checks** rather than a pile of loose sessions.

## The service flow, step by step

### Seat a party

1. In the till or the floor plan, choose a table that is `available` (or `reserved` for the party
   that just arrived).
2. Open a session with the **number of guests**, and optionally the waiter and a note.
3. The table turns `occupied`.

Seating a **reserved** table works and **consumes its hold** — the booking has arrived. Seating more
guests than the capacity is allowed; the screen warns, it does not block. Requires
`tables.add_tablesession` — an employee has this.

### Park a check and bring it back

- **Park** frees the table without closing the check or losing the order. Use it when a party leaves
  the table but the bill is still open.
- **Restore** seats that parked check again, at the same table or any free one.

Both need `tables.change_tablesession`.

### Move a check to another table

Transfer it. The origin session closes as `transferred` and its table is freed, and a new session
opens on the destination carrying the guest count, waiter and notes. The order travels with it — the
origin releases it, so no order is ever owned by two sessions.

The destination must be `available` or `reserved`. Requires `tables.change_tablesession`.

### Merge two tables

Merging joins the source session into another occupied table and frees the source.

- If only **one** of the two has an order, the survivor adopts it and you are done.
- If **both** have orders, Tables frees the room but **cannot join the lines** — `sales` does that,
  moving the rows across. The merge event carries both order references so it can.

Requires `tables.change_tablesession`.

### Split a check

1. From the ⋮ menu of any table on the plan, choose split.
2. A **second live session** opens on the same table (or another one), recorded as split from the
   first. The original stays open.
3. The new check is born **without an order**; `sales` creates one and attaches it.

Requires `tables.change_tablesession`.

### Close a check

Closing frees the table and marks the session `closed`. In normal operation you do not do this by
hand — completing the order in the till closes it for you.

### Hold a table for a booking

- **Hold** paints the table `reserved` for a window of time, with a party size and a label. It is
  idempotent: holding twice for the same booking does not create two holds.
- **Release** gives the table back when the booking is cancelled or moved.
- Holds that pass their window are **expired automatically every 15 minutes**.

A hold is not a session — nobody has sat down yet. Both actions need
`tables.change_tablesession`.

## In the till: assign a table to a check

The sell screen shows a table button contributed by this module (requires `tables.view_table`).

1. Press it. A modal opens with a tab per zone.
2. Pick a table. The check now carries it, and the sell screen shows the label.
3. **Quitar mesa** (remove table) lives inside the same selector.

The button stays available even when a table is already assigned, so you can change it. When Kitchen
is active and the check has lines not yet fired, the selector **blocks changing or removing the
table** until you send them.

## First-run setup

Tables contributes an **optional** setup step called **"Your tables"**: *Add the tables of your
dining room: without them there is no order per table, no split and no transfer.* It points at the
Tables screen and is done once there is at least one usable table. It needs `tables.add_table`.
