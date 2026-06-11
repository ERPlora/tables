-- Transferencia de sesión, paso 4/4: ocupa la mesa destino. Solo aplica si el
-- paso 3 materializó la sesión nueva en ESTA transacción.
UPDATE tables_table SET
  status     = 'occupied',
  updated_by = :current_user_id,
  updated_at = :now
WHERE id = :target_table_id AND hub_id = :hub_id AND is_deleted = 0
  AND EXISTS (SELECT 1 FROM tables_session
              WHERE id = :new_session_id AND hub_id = :hub_id);
