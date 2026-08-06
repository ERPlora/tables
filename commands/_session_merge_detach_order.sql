-- tables#12, fusión: la sesión origen SUELTA el pedido que la superviviente acaba de adoptar.
--
-- Misma invariante que en la transferencia: un pedido lo posee UNA sola sesión. Si la origen se
-- quedara con él, `_table_free_by_order` volvería a ver dos mesas para un pedido y cobrarlo
-- liberaría también la mesa que la fusión ya había vaciado — que para entonces puede tener otra
-- parroquia sentada.
--
-- Solo suelta si la adopción ocurrió DE VERDAD (el pedido está ya en la superviviente, en esta
-- misma transacción). Cuando ambas traían pedido no hubo adopción, y entonces la origen conserva el
-- suyo a propósito: es lo único que impide perder esas líneas mientras `sales` no sepa fusionarlas.
UPDATE tables_session SET
    order_id   = NULL,
    updated_by = :current_user_id,
    updated_at = :now
WHERE id = :session_id AND hub_id = :hub_id AND is_deleted = 0
  AND status = 'merged' AND updated_at = :now
  AND order_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM tables_session tgt
              WHERE tgt.id = tables_session.merged_into_id AND tgt.hub_id = :hub_id
                AND tgt.status = 'active' AND tgt.order_id = tables_session.order_id);
