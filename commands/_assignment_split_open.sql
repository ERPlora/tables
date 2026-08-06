-- tables#12, dividir 2/5: estrena el tramo de historial de la cuenta nueva, con motivo `split`.
--
-- El motivo ya estaba previsto en el CHECK de `005_session_assignment.sql` — la división se
-- contemplaba en el modelo desde el principio, solo faltaba quien la escribiera.
--
-- Va en la misma transacción que el INSERT de la sesión: si se escribieran por separado, el
-- historial dejaría de ser la fuente de verdad de por dónde pasó cada cuenta. El motivo lo fija el
-- comando (`split`), nunca la interfaz.
--
-- El `WHERE EXISTS` lo ata a que la cuenta nueva se materializara: el INSERT anterior es
-- condicional, así que sin la guarda escribiríamos el tramo de una división que no ocurrió.
INSERT INTO tables_session_assignment (
    id, hub_id, session_id, table_id, assigned_at, released_at,
    assignment_reason, release_reason, operation_id, is_deleted, created_by, updated_by, created_at
)
SELECT
    :new_id, :hub_id, s.id, s.table_id, :now, NULL,
    'split', '', COALESCE(NULLIF(:operation_id, ''), :new_id) || '-split', 0,
    :current_user_id, :current_user_id, :now
FROM tables_session s
WHERE s.id = :new_session_id AND s.hub_id = :hub_id AND s.is_deleted = 0;
