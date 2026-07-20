-- ADR-0146: libera la mesa donde estaba la sesión (proyección del estado de sala).
UPDATE tables_table SET
    status     = 'available',
    updated_by = :current_user_id,
    updated_at = :now
WHERE hub_id = :hub_id AND is_deleted = 0
  AND id IN (SELECT s.table_id FROM tables_session s WHERE s.id = :session_id AND s.hub_id = :hub_id);
