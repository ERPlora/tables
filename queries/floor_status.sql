-- Setup check (tables#24): does the floor plan have at least one USABLE table?
-- The runtime injects :hub_id. Read by `hub.setup.status` (hub#369) — see the `setup` block of
-- module.json.
--
-- WHY THIS IS THE LINE between "installed" and "configured": everything this module exists for
-- starts at the first table. No table, no order per table, no split, no merge, no transfer — the
-- floor plan is an empty canvas and the POS can only ring sales over the counter. Zones are NOT
-- part of the question: `tables_table.zone_id` is nullable, so a table with no zone is a table you
-- can seat someone at, and demanding a zone first would invent a step the module does not have.
--
-- USABLE, not merely existing. Soft-deleted is gone, and `is_active = 0` is off the floor plan —
-- neither can host a party, so neither ticks the item.
--
-- `status` is deliberately NOT in the WHERE clause. An occupied, reserved or blocked table is
-- still a table: a full dining room is the most configured a floor plan ever is, and filtering by
-- status would flip the checklist back to "pending" in the middle of service.
--
-- COUNT() with no GROUP BY answers exactly ONE row, `0` included. That matters: `hub.setup.status`
-- reads the first row, and the runtime omits an item whose check could not run. Answering `0`
-- rather than answering nothing is how "no tables yet" stays distinguishable from "the check
-- failed" — the first is the user's task, the second is ours.
SELECT COUNT(*) AS usable_tables
FROM tables_table
WHERE hub_id = :hub_id AND is_deleted = 0 AND is_active = 1
