-- ADR-0146: recupera una cuenta aparcada y la sienta en una mesa (la misma u otra).
-- La sesión vuelve a `active` y su proyección apunta a la mesa nueva.
UPDATE tables_session SET
    status     = 'active',
    table_id   = :table_id,
    updated_by = :current_user_id,
    updated_at = :now
WHERE id = :session_id AND hub_id = :hub_id AND is_deleted = 0 AND status = 'parked';
