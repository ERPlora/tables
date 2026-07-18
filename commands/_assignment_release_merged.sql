-- ADR-0146: cierra el tramo VIVO de una sesión con motivo `merged` — al fusionar dos mesas en una cuenta.
--
-- El motivo va escrito AQUÍ y no como parámetro: lo fija el comando que se ejecuta, así no depende
-- de que la interfaz lo mande bien.
--
-- Va siempre en la misma transacción que el cambio de estado de la sesión. Idempotente: si no hay
-- tramo vivo (ya se cerró), no toca nada.
UPDATE tables_session_assignment SET
    released_at    = :now,
    release_reason = 'merged',
    updated_by     = :current_user_id,
    updated_at     = :now
WHERE session_id = :session_id AND hub_id = :hub_id
  AND released_at IS NULL AND is_deleted = 0;
