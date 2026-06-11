-- Transferencia de sesión, paso 2/4: libera la mesa origen. La subquery solo
-- resuelve si el paso 1 realmente aplicó (sesión `transferred` con updated_at = :now
-- en ESTA transacción).
UPDATE tables_table SET
  status     = 'available',
  updated_by = :current_user_id,
  updated_at = :now
WHERE hub_id = :hub_id AND is_deleted = 0
  AND id = (SELECT table_id FROM tables_session
            WHERE id = :session_id AND hub_id = :hub_id
              AND status = 'transferred' AND updated_at = :now);
