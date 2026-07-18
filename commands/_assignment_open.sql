-- ADR-0146: estrena el tramo de historial de una sesión recién abierta. Va en la MISMA transacción
-- que el INSERT de la sesión (`tables._session_open`): si se escribieran por separado, el historial
-- podría quedar desincronizado y dejaría de ser fuente de verdad.
--
-- El `SELECT ... WHERE EXISTS` lo ata a que la sesión se haya materializado de verdad: la apertura
-- es condicional (solo si la mesa estaba libre), así que sin esta guarda escribiríamos el tramo de
-- una sesión que no existe.
--
-- El motivo NO lo manda la interfaz: lo fija el comando (`opened`).
INSERT INTO tables_session_assignment (
    id, hub_id, session_id, table_id, assigned_at, released_at,
    assignment_reason, release_reason, operation_id, is_deleted, created_by, updated_by, created_at
)
SELECT
    :new_id, :hub_id, s.id, s.table_id, :now, NULL,
    'opened', '', COALESCE(NULLIF(:operation_id, ''), :new_id), 0, :current_user_id, :current_user_id, :now
FROM tables_session s
WHERE s.id = :session_id AND s.hub_id = :hub_id AND s.is_deleted = 0;
