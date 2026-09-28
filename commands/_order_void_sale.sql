-- tables#96 · first step of the `sale.voided` listener: an annulled sale stops counting on its
-- check. Keyed by (hub_id, sale_id) — another hub's void can never reach this hub's row — and
-- idempotent: a redelivered void finds the row already `voided` and touches nothing.
UPDATE tables_order_payment SET
    status     = 'voided',
    updated_by = :current_user_id,
    updated_at = :now
WHERE hub_id = :hub_id AND sale_id = CAST(:sale_id AS TEXT) AND status = 'paid' AND is_deleted = 0;
