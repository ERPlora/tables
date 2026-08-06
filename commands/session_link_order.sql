-- ADR-0141: enlaza la sesión ACTIVA de una mesa con el pedido abierto del TPV. Es la escritura de
-- la JUNCTION mesa↔pedido: `tables` (satélite) OWNea la asociación, `sales` no conoce la mesa.
-- Idempotente: solo sesiones vivas; re-enlazar con el mismo pedido no hace daño.
--
-- tables#12: desde que se puede DIVIDIR la cuenta, «la sesión activa de esta mesa» ya no es una
-- sola. Enganchar por `table_id` a secas hacía que el pedido de la segunda cuenta ATERRIZARA EN LA
-- PRIMERA, machacando su `order_id`: la cuenta original se quedaba sin pedido y las dos mitades
-- acababan cobrando la misma comanda.
--
-- Ahora el TPV manda `:session_id` cuando sabe a qué cuenta apunta (siempre que hay división). Sin
-- él se resuelve a la cuenta MÁS ANTIGUA de la mesa —la original, la que abrió el servicio—, que es
-- determinista y coincide con el comportamiento de siempre cuando la mesa tiene una sola cuenta.
UPDATE tables_session
SET order_id = :order_id, updated_by = :current_user_id, updated_at = :now
WHERE hub_id = :hub_id AND status = 'active' AND is_deleted = 0
  AND id = COALESCE(
        NULLIF(CAST(:session_id AS TEXT), ''),
        (SELECT s.id FROM tables_session s
         WHERE s.hub_id = :hub_id AND s.table_id = :table_id
           AND s.status = 'active' AND s.is_deleted = 0
         ORDER BY s.opened_at ASC, s.id ASC
         LIMIT 1));
