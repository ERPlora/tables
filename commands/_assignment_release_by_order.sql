-- ADR-0146: cierra el tramo de historial de la sesión que acaba de terminar por fin de pedido.
-- Va en la misma transacción que el cierre de la sesión: si se escribieran por separado, el
-- historial diría que la mesa sigue ocupada.
UPDATE tables_session_assignment SET
    released_at    = :now,
    release_reason = 'closed',
    updated_by     = :current_user_id,
    updated_at     = :now
WHERE hub_id = :hub_id AND released_at IS NULL AND is_deleted = 0
  AND session_id IN (
      SELECT s.id FROM tables_session s
      WHERE s.hub_id = :hub_id AND s.order_id = :order_id AND s.is_deleted = 0
  );
