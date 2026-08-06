-- ADR-0146: devuelve la mesa a `available` cuando su pedido termina. Es la proyección del estado
-- de sala: la verdad («¿hubo alguien sentado y cuándo?») la lleva el historial de asignaciones.
--
-- tables#12, las dos guardas que faltaban:
--
--   · `NOT EXISTS` sesión activa — con la cuenta dividida, una mesa tiene dos pedidos vivos: cobrar
--     el primero no puede vaciar la mesa mientras el segundo sigue abierto.
--   · `s.status = 'closed'` — antes bastaba con que la sesión llevara el pedido, en cualquier
--     estado. Como transferir dejaba el `order_id` también en la sesión origen (ya `transferred`),
--     esta sentencia liberaba la mesa que la gente había DEJADO, con otros clientes sentados en
--     ella. Con `_session_transfer_detach_order` el pedido ya solo lo tiene una sesión, pero el
--     filtro se queda: una mesa solo la suelta la sesión que acaba de cerrarse.
UPDATE tables_table SET
    status     = 'available',
    updated_by = :current_user_id,
    updated_at = :now
WHERE hub_id = :hub_id AND is_deleted = 0 AND status = 'occupied'
  AND id IN (
      SELECT s.table_id FROM tables_session s
      WHERE s.hub_id = :hub_id AND s.order_id = :order_id AND s.is_deleted = 0
        AND s.status = 'closed'
  )
  AND NOT EXISTS (SELECT 1 FROM tables_session s2
                  WHERE s2.hub_id = :hub_id AND s2.table_id = tables_table.id
                    AND s2.status = 'active' AND s2.is_deleted = 0);
