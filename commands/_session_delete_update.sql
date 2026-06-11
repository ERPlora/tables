-- Soft-delete de sesión CON guarda de estado (WASM-TODO §delete_session).
-- Lo invoca el handler WASM `delete_session` (command privado `tables._session_delete`).
-- Rechaza si la sesión está `active` (hay que cerrarla primero); conserva el
-- histórico para reporting. Runtime inyecta :hub_id, :current_user_id, :now.
UPDATE tables_session SET
  is_deleted = 1,
  deleted_at = :now,
  updated_by = :current_user_id,
  updated_at = :now
WHERE id = :session_id AND hub_id = :hub_id AND is_deleted = 0
  AND status <> 'active';
