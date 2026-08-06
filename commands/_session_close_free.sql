-- Libera la mesa asociada tras cerrar la sesión (segunda escritura del par
-- sesión↔mesa). La subquery solo resuelve si el UPDATE condicional del cierre
-- realmente aplicó (sesión `closed` con updated_at = :now en ESTA transacción).
--
-- tables#12: cerrar una cuenta NO libera la mesa si queda otra abierta en ella. Desde que se puede
-- dividir, una mesa puede tener dos cuentas vivas: pagar la primera vaciaba la mesa en el plano
-- mientras la segunda seguía comiendo, y el TPV daba la mesa por libre para la parroquia siguiente.
UPDATE tables_table SET
  status     = 'available',
  updated_by = :current_user_id,
  updated_at = :now
WHERE hub_id = :hub_id AND is_deleted = 0 AND status = 'occupied'
  AND id = (SELECT table_id FROM tables_session
            WHERE id = :session_id AND hub_id = :hub_id
              AND status = 'closed' AND updated_at = :now)
  AND NOT EXISTS (SELECT 1 FROM tables_session s2
                  WHERE s2.hub_id = :hub_id AND s2.table_id = tables_table.id
                    AND s2.status = 'active' AND s2.is_deleted = 0);
