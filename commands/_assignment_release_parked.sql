-- ADR-0146: cierra el tramo vivo al aparcar. Aparcar NO abre tramo nuevo: mientras la cuenta
-- espera no está en ninguna mesa, así que el periodo aparcado no se inventa una asignación.
UPDATE tables_session_assignment SET
    released_at    = :now,
    release_reason = 'parked',
    updated_by     = :current_user_id,
    updated_at     = :now
WHERE session_id = :session_id AND hub_id = :hub_id
  AND released_at IS NULL AND is_deleted = 0;
