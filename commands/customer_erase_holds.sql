-- pm#637 (TABLES-F31) — `customer.anonymized`: the floor plan forgets the erased customer's name.
--
-- The only personal datum a hold copies is the guest's name (`label`, from the reservation); it is
-- emptied — never replaced by a stored placeholder: the screen says «Deleted customer» in the
-- reader's language when a hold has a `customer_id` and no name. Everything the business keeps
-- (table, window, party size, status, reservation reference, customer id) stays, on every hold of
-- hers whatever its status, deleted ones included.
--
-- `hub_id` is the relay's, not the payload's: the runtime overwrites it with the delivering hub, so
-- the same opaque id in another hub never matches. The empty-id guard keeps an event without an id
-- from emptying every hold without a sheet (their `customer_id` is ''). `label <> ''` makes the
-- at-least-once redelivery a no-op that does not re-stamp the row.
UPDATE tables_table_hold
   SET label      = '',
       updated_by = :current_user_id,
       updated_at = :now
 WHERE hub_id = :hub_id
   AND customer_id = CAST(:customer_id AS TEXT)
   AND CAST(:customer_id AS TEXT) <> ''
   AND label <> '';
