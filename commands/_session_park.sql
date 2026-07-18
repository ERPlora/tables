-- ADR-0146: aparcar una cuenta = soltar la mesa SIN cerrar la cuenta. La sesión sigue viva
-- (`parked`), así que conserva sus comensales, su camarero y desde cuándo se está atendiendo.
--
-- `table_id` NO se pone a NULL: es una PROYECCIÓN (la última mesa donde estuvo), no la verdad. La
-- verdad —si hay alguien sentado y dónde— la lleva el historial de asignaciones, y aparcar cierra
-- su tramo vivo. Dejarlo apuntando evita reconstruir la tabla en SQLite (que no sabe quitar un
-- NOT NULL) sobre la tabla que acabamos de convertir en fuente de verdad, con su FK en cascada.
UPDATE tables_session SET
    status     = 'parked',
    updated_by = :current_user_id,
    updated_at = :now
WHERE id = :session_id AND hub_id = :hub_id AND is_deleted = 0 AND status = 'active';
