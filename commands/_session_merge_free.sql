-- Fusión de comanda, paso 2/3: libera la mesa ORIGEN. La subquery solo resuelve si el paso 1
-- realmente aplicó (sesión origen `merged` con updated_at = :now en ESTA transacción). La mesa
-- destino NO se toca: sigue `occupied` con su sesión activa.
UPDATE tables_table SET
  status     = 'available',
  updated_by = :current_user_id,
  updated_at = :now
WHERE hub_id = :hub_id AND is_deleted = 0 AND status = 'occupied'
  AND id = (SELECT table_id FROM tables_session
            WHERE id = :session_id AND hub_id = :hub_id
              AND status = 'merged' AND updated_at = :now);
