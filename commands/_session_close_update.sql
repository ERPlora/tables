-- Cierre de sesión CON guarda de estado (WASM-TODO §close_session).
-- Lo invoca el handler WASM `close_session` (command privado `tables._session_close`).
-- Solo aplica si la sesión está `active`; merge opcional de :notes (se añade en
-- línea nueva a las notas existentes). Runtime inyecta :hub_id, :current_user_id, :now.
UPDATE tables_session SET
  status     = 'closed',
  closed_at  = :now,
  notes      = CASE
                 WHEN :notes IS NOT NULL AND :notes <> '' THEN
                   CASE WHEN notes IS NULL OR notes = '' THEN :notes
                        ELSE notes || char(10) || :notes END
                 ELSE notes
               END,
  updated_by = :current_user_id,
  updated_at = :now
WHERE id = :session_id AND hub_id = :hub_id AND is_deleted = 0
  AND status = 'active';
