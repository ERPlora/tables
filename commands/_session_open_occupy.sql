-- Ocupa la mesa tras abrir la sesión (segunda escritura del par sesión↔mesa).
-- Solo aplica si el INSERT condicional materializó la sesión (la mesa estaba
-- `available` dentro de ESTA transacción).
UPDATE tables_table SET
  status     = 'occupied',
  updated_by = :current_user_id,
  updated_at = :now
WHERE id = :table_id AND hub_id = :hub_id AND is_deleted = 0
  AND EXISTS (SELECT 1 FROM tables_session
              WHERE id = :session_id AND hub_id = :hub_id);
