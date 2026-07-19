-- ADR-0146: aparcar una cuenta = soltar la mesa SIN cerrar la cuenta. La sesión sigue viva
-- (`parked`), así que conserva sus comensales, su camarero y desde cuándo se está atendiendo.
--
-- `table_id` conserva la ÚLTIMA mesa, como referencia para recuperar o mostrar de dónde viene la
-- cuenta. No miente sobre la ocupación porque la ocupación NO se lee de aquí: la marca el tramo
-- vivo del historial (`released_at IS NULL`), y aparcar cierra el suyo. Se descartó volverla
-- anulable: obligaba a reconstruir la tabla en SQLite —con el historial colgando de una FK en
-- cascada— para no añadir ninguna información que `status='parked'` y la ausencia de tramo vivo no
-- den ya. El orden importa: la mesa se libera ANTES, mientras la sesión aún sabe cuál era.
UPDATE tables_session SET
    status     = 'parked',
    updated_by = :current_user_id,
    updated_at = :now
WHERE id = :session_id AND hub_id = :hub_id AND is_deleted = 0 AND status = 'active';
