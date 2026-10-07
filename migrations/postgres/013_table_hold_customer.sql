-- 013_table_hold_customer.sql — pm#637 (TABLES-F31): a hold knows WHOSE name it paints.
--
-- The hold copies the guest's name from the reservation (`label`, 008) so the plan can say for whom
-- a table is reserved. When that customer's personal data is erased in Clientes
-- (`customer.anonymized`), the copy has to go too — and a hold that only knows its reservation
-- (`source_ref`, opaque by contract §2.5) cannot be found by customer. The reservation event already
-- carries `customer_id`: keeping it here is what lets `tables._on_customer_anonymized` find her holds
-- without ever reading `reservations`. '' = no sheet (a walk-in name, a hold made by hand).
--
-- Additive: rolling the module back leaves the column unread.
ALTER TABLE tables_table_hold ADD COLUMN IF NOT EXISTS customer_id TEXT NOT NULL DEFAULT '';

-- The erasure's only read: «every hold of this customer in this hub».
CREATE INDEX IF NOT EXISTS ix_table_hold_customer
    ON tables_table_hold (hub_id, customer_id);

-- Holds written before this version have no `customer_id`, so an erasure cannot find them. The ones
-- that are already over (released, expired, consumed) are read by no screen — the plan only paints
-- `held` — so their name is dropped now instead of kept forever; from this version on every hold
-- forgets its name when it ends. The live ones keep it: the plan still paints them, and they end
-- (and forget) by their reservation's own window at the latest.
UPDATE tables_table_hold SET label = '' WHERE status <> 'held' AND label <> '';
