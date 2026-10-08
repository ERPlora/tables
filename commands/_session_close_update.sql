-- Cierre de sesión CON guarda de estado (WASM-TODO §close_session).
-- Lo invoca el handler WASM `close_session` (command privado `tables._session_close`).
-- Solo aplica si la sesión está `active`; merge opcional de :notes (se añade en
-- línea nueva a las notas existentes). Runtime inyecta :hub_id, :current_user_id, :now.
--
-- `:notes` se usa SOLO dentro de la comparación de la guarda; cuando el POS cierra sin notas el
-- driver lo binda como NULL sin tipo y Postgres no puede inferirlo -> 42P08 (issue #20). El CAST
-- explícito le da tipo al parámetro (SQLite no lo sufría por su tipado dinámico).
UPDATE tables_session SET
  status     = 'closed',
  closed_at  = :now,
  notes      = CASE
                 WHEN CAST(:notes AS TEXT) IS NOT NULL AND CAST(:notes AS TEXT) <> '' THEN
                   CASE WHEN notes IS NULL OR notes = '' THEN :notes
                        ELSE notes || '
' || :notes END
                 ELSE notes
               END,
  updated_by = :current_user_id,
  updated_at = :now
WHERE id = :session_id AND hub_id = :hub_id AND is_deleted = 0
  AND status = 'active'
  -- tables#124: only for the bill the check really carries (none, or the one named). The handler
  -- refuses by code when the bill is still open in sales; this is the net under it (a caller that
  -- names no bill or another one never frees a table with a bill). No match → the gate refuses.
  AND order_id IS NOT DISTINCT FROM CAST(:order_id AS TEXT);
