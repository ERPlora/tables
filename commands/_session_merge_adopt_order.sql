-- tables#12 — juntar mesas tampoco re-apuntaba la comanda.
--
-- La fusión cerraba la sesión origen y liberaba su mesa, pero su `order_id` se quedaba en esa fila
-- muerta. La cuenta superviviente —la de la mesa destino— no sabía nada del pedido que acababa de
-- absorber: cobrarla no cerraba aquel pedido ni liberaba la mesa, y el pedido quedaba huérfano en
-- una sesión `merged` que ya no está en ninguna mesa.
--
-- Cuando la mesa destino AÚN NO tiene pedido (lo normal al juntar: se sientan y se les une la mesa
-- de al lado antes de pedir), la cuenta superviviente ADOPTA el pedido de la origen. Un solo
-- pedido, una sola sesión viva: los productos y los importes se conservan sin que nadie copie
-- líneas, igual que en la transferencia (ADR-0141).
--
-- Cuando las DOS traen pedido, `tables` no puede resolverlo: fundir dos comandas es fundir líneas e
-- importes, y eso lo OWNea `sales`. En ese caso esta sentencia no aplica, cada pedido sigue en su
-- sesión y el evento `tables.session.merged` lleva ambos para que `sales` los una (ver #12).
UPDATE tables_session SET
    order_id   = (SELECT o.order_id FROM tables_session o
                  WHERE o.id = :session_id AND o.hub_id = :hub_id),
    updated_by = :current_user_id,
    updated_at = :now
WHERE hub_id = :hub_id AND is_deleted = 0 AND status = 'active'
  AND (order_id IS NULL OR order_id = '')
  AND id = (SELECT o.merged_into_id FROM tables_session o
            WHERE o.id = :session_id AND o.hub_id = :hub_id
              AND o.status = 'merged' AND o.updated_at = :now)
  AND EXISTS (SELECT 1 FROM tables_session o
              WHERE o.id = :session_id AND o.hub_id = :hub_id
                AND o.order_id IS NOT NULL AND o.order_id <> '');
