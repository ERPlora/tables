-- ADR-0146: marca ocupada la mesa donde se acaba de sentar una cuenta recuperada.
UPDATE tables_table SET
    status     = 'occupied',
    updated_by = :current_user_id,
    updated_at = :now
WHERE id = :table_id AND hub_id = :hub_id AND is_deleted = 0;
