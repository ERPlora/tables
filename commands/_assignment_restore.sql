-- ADR-0146: estrena el tramo de la mesa donde se recupera una cuenta aparcada (motivo `restored`).
-- Solo si la sesión existe y está viva tras el UPDATE anterior: así el historial no registra una
-- estancia que no llegó a ocurrir.
INSERT INTO tables_session_assignment (
    id, hub_id, session_id, table_id, assigned_at, released_at,
    assignment_reason, release_reason, operation_id, is_deleted, created_by, updated_by, created_at
)
SELECT
    :new_id, :hub_id, s.id, :table_id, :now, NULL,
    'restored', '', COALESCE(NULLIF(:operation_id, ''), :new_id), 0,
    :current_user_id, :current_user_id, :now
FROM tables_session s
WHERE s.id = :session_id AND s.hub_id = :hub_id AND s.is_deleted = 0 AND s.status = 'active';
