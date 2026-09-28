-- tables#96 · listener of `sale.completed`: records what a sale charged on the check whose order
-- it belongs to.
--
-- Only a TABLE CHECK is tables' business: a counter sale (no order) or an order no session of this
-- hub holds (takeaway, a parked retail ticket) leaves no row. Idempotent on (hub_id, sale_id): the
-- outbox is at-least-once and a redelivered sale must not charge the check twice.
INSERT INTO tables_order_payment
    (id, hub_id, order_id, sale_id, total, status, is_deleted, created_by, updated_by, created_at, updated_at)
SELECT :new_id, :hub_id, CAST(:order_id AS TEXT), CAST(:sale_id AS TEXT), COALESCE(CAST(:total AS BIGINT), 0),
       'paid', 0, :current_user_id, :current_user_id, :now, :now
WHERE NULLIF(CAST(:order_id AS TEXT), '') IS NOT NULL
  AND NULLIF(CAST(:sale_id AS TEXT), '') IS NOT NULL
  AND EXISTS (SELECT 1 FROM tables_session s
              WHERE s.hub_id = :hub_id AND s.is_deleted = 0
                AND s.order_id = CAST(:order_id AS TEXT))
ON CONFLICT (hub_id, sale_id) DO NOTHING;
