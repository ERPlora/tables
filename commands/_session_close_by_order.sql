-- ADR-0146: closes the session linked to an order that has just been charged in full
-- (`order.completed`).
--
-- Before, somebody had to remember to close the session by hand and, when nobody did, the table
-- stayed occupied forever. Now the order itself triggers it: `tables` listens for the end of the
-- ORDER —not of a sale, which also happens on a partial charge— and lets go of what is its own.
-- tables#121: voiding a sale does not run this either; the void leaves the order open in `sales`.
--
-- Idempotent: the relay can redeliver; if the session is already closed, no row is touched.
UPDATE tables_session SET
    status     = 'closed',
    closed_at  = :now,
    updated_by = :current_user_id,
    updated_at = :now
WHERE hub_id = :hub_id AND order_id = :order_id AND status = 'active' AND is_deleted = 0;
