# Tables — Limits and troubleshooting

## Refusals you will actually see

| Refusal | What happened | What to do |
|---|---|---|
| `not_available` | You tried to seat a party at a table that is not `available` | Free it, or use the table that party is really at |
| `tables_attached` | You tried to delete a zone that still has active tables | Move or delete the tables first |
| `active_sessions` | You tried to delete a table with a live check | Close the check first |
| Session delete refused | The session is still `active` | Close it, then delete |
| Transfer refused | The origin is not active, or the destination is not free or reserved | Check both ends |
| Bulk creation rolled back | The target zone does not exist | Create the zone first; the batch is all-or-nothing |
| `invalid_capacity` | Capacity of zero or less | Capacity must be at least 1 |
| `invalid_status` | A status outside the four allowed values | Use `available`, `occupied`, `reserved` or `blocked` |

## Caps and sizes

| Limit | Value |
|---|---|
| Tables per bulk creation | 1–100 |
| Rows per page (zones, tables, sessions) | 50 |
| Maximum rows a paginated request may ask for | 500 |
| Guests when opening a session | at least 1 |
| Default capacity of a new table | 4 |
| Hold expiry sweep | every 15 minutes |

Bulk-created tables are laid out five per row on the canvas; you can drag them afterwards.

## Permissions per action

| To do this | You need |
|---|---|
| See zones, tables and sessions | `tables.view_zone`, `tables.view_table`, `tables.view_tablesession` |
| Create or change a zone | `tables.add_zone` / `tables.change_zone` |
| Create, change, move or bulk-create tables | `tables.add_table` / `tables.change_table` |
| Open a session (seat a party) | `tables.add_tablesession` |
| Close, split, park, restore, hold, release | `tables.change_tablesession` |
| **Transfer or merge** a check (it changes who owns the money) | `tables.transfer_tablesession` — tables#66. Llave aparte, concedida por defecto a `manager`, `employee` y `cashier`: el local que quiera el gate de encargado (la casilla «Table transfer» de Lightspeed, el código de encargado de Toast) la quita a un rol y no pierde cerrar ni corregir comensales |
| Link an order to a session | `tables.add_tablesession` |
| Delete a zone / a table / a session | `tables.delete_zone` / `tables.delete_table` / `tables.delete_tablesession` |
| Change the module settings | `tables.manage_settings` |

By role: **admin** has everything. **manager** has everything except the three deletes and
`manage_settings`. **employee** can see the plan and **run the floor** — seat, close, transfer,
merge, split, park, restore — but **cannot create or edit tables and zones**, and cannot delete
anything.

That split is intentional: a waiter needs every session action and none of the layout ones.

## Dependencies — what breaks if something is missing

**Tables depends on nothing** and can be installed alone.

**`sales` is optional but expected.** Without it:

- there is no till, so the table selector has nowhere to appear;
- nothing emits `order.completed`, so **sessions never close by themselves** — you would close every
  check by hand;
- splitting opens a second session that never receives an order.

**`reservations` is optional.** Without it, nothing holds tables; the plan simply never shows
`reserved`.

**Nothing depends on Tables.** Turning it off removes the table selector from the till and the floor
plan. Kitchen, Customers and the checks in `sales` keep working — a takeaway pizzeria runs with no
dining room at all.

## When something looks wrong

**"The table did not free up after paying."** Only part of the bill was charged. The table frees when
the **order** completes, not on each payment. Check whether lines are still unpaid.

**"I cannot seat anyone at this table."** Its status is not `available`. If it is `reserved` you
*can* seat the booked party — that is allowed and consumes the hold. If it is `occupied`, find the
open check; if it is `blocked`, someone blocked it deliberately.

**"A table is stuck as reserved and nobody came."** It will clear on the next sweep, within 15
minutes. To do it now, release the hold.

**"I merged two tables and the lines did not join."** Both checks had orders, so Tables freed the
room but the lines are `sales`'s job. Complete the merge from the till.

**"The second half of a split check is empty."** That is how it is born. `sales` attaches the new
order; if it never arrived, the check has no lines.

**"Both halves of a split are charging the same order."** They should not be — the link must be made
against the **session**, not the table. If the second order landed on the older check, the link was
made without the session reference.

**"I cannot change the table while ordering."** Kitchen is active and there are lines not yet fired.
Send them first.

**"I deleted a zone and its tables vanished."** Deleting a zone removes its tables; that is why it is
refused while active tables remain. Everything is soft-deleted, so the history survives.

**"Six people at a table for four went through."** Correct. Capacity is a warning, not a rule.
