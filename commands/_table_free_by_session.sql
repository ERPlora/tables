-- ADR-0146: libera la mesa donde estaba la sesión (proyección del estado de sala).
--
-- tables#54: la subconsulta resuelve la mesa SOLO de una cuenta abierta — la misma precondición
-- que exige `_session_park`, que corre después. Sin ella, aparcar una cuenta ya cerrada podía
-- liberar «su» mesa (donde para entonces ya hay otra gente sentada) y, de paso, sumar la fila que
-- neutraliza el `expect_rows` del command (hub#1091: la gate suma las tres sentencias).
UPDATE tables_table SET
    status     = 'available',
    updated_by = :current_user_id,
    updated_at = :now
WHERE hub_id = :hub_id AND is_deleted = 0 AND status = 'occupied'
  AND id IN (SELECT s.table_id FROM tables_session s
             WHERE s.id = :session_id AND s.hub_id = :hub_id
               AND s.status = 'active' AND s.is_deleted = 0)
  AND NOT EXISTS (SELECT 1 FROM tables_session s2
                  WHERE s2.hub_id = :hub_id AND s2.table_id = tables_table.id
                    AND s2.status = 'active' AND s2.is_deleted = 0 AND s2.id <> :session_id);
