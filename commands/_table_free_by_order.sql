-- ADR-0146: devuelve la mesa a `available` cuando su pedido termina. Es la proyección del estado
-- de sala: la verdad («¿hubo alguien sentado y cuándo?») la lleva el historial de asignaciones.
UPDATE tables_table SET
    status     = 'available',
    updated_by = :current_user_id,
    updated_at = :now
WHERE hub_id = :hub_id AND is_deleted = 0
  AND id IN (
      SELECT s.table_id FROM tables_session s
      WHERE s.hub_id = :hub_id AND s.order_id = :order_id AND s.is_deleted = 0
  );
