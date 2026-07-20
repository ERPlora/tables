-- ADR-0146: abre el tramo de la sesión NUEVA que crea una transferencia, con motivo `transferred`.
-- Va en la misma transacción que el INSERT de esa sesión y después de cerrar el tramo de la origen.
--
-- La guarda `WHERE EXISTS` importa: la sesión destino solo se materializa si la mesa estaba libre,
-- así que sin ella escribiríamos el tramo de una transferencia que no llegó a ocurrir.
INSERT INTO tables_session_assignment (
    id, hub_id, session_id, table_id, assigned_at, released_at,
    assignment_reason, release_reason, operation_id, is_deleted, created_by, updated_by, created_at
)
SELECT
    :new_id, :hub_id, s.id, s.table_id, :now, NULL,
    'transferred', '', COALESCE(NULLIF(:operation_id, ''), :new_id) || '-to', 0,
    :current_user_id, :current_user_id, :now
FROM tables_session s
WHERE s.id = :new_session_id AND s.hub_id = :hub_id AND s.is_deleted = 0;
