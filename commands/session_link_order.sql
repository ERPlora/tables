-- ADR-0141: enlaza la sesión ACTIVA de una mesa con el pedido abierto del TPV. Es la escritura de
-- la JUNCTION mesa↔pedido: `tables` (satélite) OWNea la asociación, `sales` no conoce la mesa.
-- Idempotente: solo la sesión viva de esa mesa; re-enlazar con el mismo pedido no hace daño.
UPDATE tables_session
SET order_id = :order_id, updated_by = :current_user_id, updated_at = :now
WHERE hub_id = :hub_id AND table_id = :table_id AND status = 'active' AND is_deleted = 0;
