-- ADR-0146: libera la mesa donde estaba la sesión (proyección del estado de sala).
UPDATE tables_table SET
    status     = 'available',
    updated_by = :current_user_id,
    updated_at = :now
WHERE hub_id = :hub_id AND is_deleted = 0 AND status = 'occupied'
  AND id IN (SELECT s.table_id FROM tables_session s WHERE s.id = :session_id AND s.hub_id = :hub_id)
  AND NOT EXISTS (SELECT 1 FROM tables_session s2
                  WHERE s2.hub_id = :hub_id AND s2.table_id = tables_table.id
                    AND s2.status = 'active' AND s2.is_deleted = 0 AND s2.id <> :session_id);
