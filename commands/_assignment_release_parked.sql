-- ADR-0146: cierra el tramo vivo al aparcar. Aparcar NO abre tramo nuevo: mientras la cuenta
-- espera no está en ninguna mesa, así que el periodo aparcado no se inventa una asignación.
--
-- tables#54: la MISMA precondición que exige `_session_park` (la cuenta está abierta). El
-- `expect_rows` del command se evalúa sobre la SUMA de las tres sentencias, no sobre la guardada
-- (hub#1091): sin este EXISTS, cerrar aquí un tramo huérfano pagaría el peaje por el UPDATE que se
-- negó y `tables.session.parked` volvería a salir al bus por un aparcamiento que no ocurrió.
UPDATE tables_session_assignment SET
    released_at    = :now,
    release_reason = 'parked',
    updated_by     = :current_user_id,
    updated_at     = :now
WHERE session_id = :session_id AND hub_id = :hub_id
  AND released_at IS NULL AND is_deleted = 0
  AND EXISTS (SELECT 1 FROM tables_session s
              WHERE s.id = :session_id AND s.hub_id = :hub_id
                AND s.status = 'active' AND s.is_deleted = 0);
