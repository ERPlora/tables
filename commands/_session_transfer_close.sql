-- Transferencia de sesión, paso 1/4 (WASM-TODO §transfer_session).
-- Lo invoca el handler WASM `transfer_session` (command privado `tables._session_transfer`).
-- Marca la sesión origen `transferred` + closed_at = :now. Solo aplica si la sesión
-- está `active`; si no, los pasos siguientes quedan sin efecto y el assert revierte.
-- Runtime inyecta :hub_id, :current_user_id, :now.
UPDATE tables_session SET
  status     = 'transferred',
  closed_at  = :now,
  updated_by = :current_user_id,
  updated_at = :now
WHERE id = :session_id AND hub_id = :hub_id AND is_deleted = 0
  AND status = 'active';
