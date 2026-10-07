-- tables#96 · the whole `sale.voided` listener: an annulled sale stops counting on its check.
-- Keyed by (hub_id, sale_id) — another hub's void can never reach this hub's row — and idempotent:
-- a redelivered void finds the row already `voided` and touches nothing.
--
-- tables#121: it does NOT close the check nor free the table. Voiding a sale leaves its order open
-- in `sales` (only the sale row changes), so after voiding a partial charge the party is still
-- seated with the rest to pay. The check ends when the order does — `order.completed`, through
-- `tables._session_close_by_order` — and a check whose order already completed is closed already.
UPDATE tables_order_payment SET
    status     = 'voided',
    updated_by = :current_user_id,
    updated_at = :now
WHERE hub_id = :hub_id AND sale_id = CAST(:sale_id AS TEXT) AND status = 'paid' AND is_deleted = 0;
