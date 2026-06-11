-- Libera la mesa asociada tras cerrar la sesión (segunda escritura del par
-- sesión↔mesa). La subquery solo resuelve si el UPDATE condicional del cierre
-- realmente aplicó (sesión `closed` con updated_at = :now en ESTA transacción).
UPDATE tables_table SET
  status     = 'available',
  updated_by = :current_user_id,
  updated_at = :now
WHERE hub_id = :hub_id AND is_deleted = 0
  AND id = (SELECT table_id FROM tables_session
            WHERE id = :session_id AND hub_id = :hub_id
              AND status = 'closed' AND updated_at = :now);
