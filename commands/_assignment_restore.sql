-- ADR-0146: estrena el tramo de la mesa donde se recupera una cuenta aparcada (motivo `restored`).
-- Solo si la sesión existe y está viva tras el UPDATE anterior: así el historial no registra una
-- estancia que no llegó a ocurrir.
--
-- tables#54: y solo si NO tiene ya un tramo abierto. Una cuenta que estaba aparcada no lo tiene
-- (`_assignment_release_parked` lo cerró), así que la condición no estorba al camino legítimo; lo
-- que corta es «recuperar» una cuenta que ya está sentada, que aquí abría un segundo tramo vivo
-- —contra el índice único de la tabla— y de paso pagaba el peaje del `expect_rows` por el UPDATE
-- que se negó (hub#1091: la gate suma las cuatro sentencias del command).
INSERT INTO tables_session_assignment (
    id, hub_id, session_id, table_id, assigned_at, released_at,
    assignment_reason, release_reason, operation_id, is_deleted, created_by, updated_by, created_at
)
SELECT
    :new_id, :hub_id, s.id, :table_id, :now, NULL,
    'restored', '', COALESCE(NULLIF(:operation_id, ''), :new_id), 0,
    :current_user_id, :current_user_id, :now
FROM tables_session s
WHERE s.id = :session_id AND s.hub_id = :hub_id AND s.is_deleted = 0 AND s.status = 'active'
  AND NOT EXISTS (SELECT 1 FROM tables_session_assignment a
                  WHERE a.hub_id = :hub_id AND a.session_id = s.id
                    AND a.released_at IS NULL AND a.is_deleted = 0);
