-- Soft-delete de mesa CON guarda de integridad (WASM-TODO §delete_table).
-- Lo invoca el handler WASM `delete_table` (command privado `tables._table_delete`).
-- Solo aplica si la mesa NO tiene sesiones activas; si tiene, el UPDATE queda sin
-- efecto y el assert revierte (`active_sessions`). Runtime inyecta :hub_id,
-- :current_user_id, :now.
UPDATE tables_table SET
  is_deleted = 1,
  is_active  = 0,
  deleted_at = :now,
  updated_by = :current_user_id,
  updated_at = :now
WHERE id = :table_id AND hub_id = :hub_id AND is_deleted = 0
  AND NOT EXISTS (
        SELECT 1 FROM tables_session s
        WHERE s.hub_id = :hub_id AND s.table_id = :table_id
          AND s.is_deleted = 0 AND s.status = 'active');
