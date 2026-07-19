-- ADR-0146: aparcar una cuenta = soltar la mesa SIN cerrar la cuenta. La sesión sigue viva
-- (`parked`), así que conserva sus comensales, su camarero y desde cuándo se está atendiendo.
--
-- `table_id` a NULL: la columna significa **mesa actual**, y una cuenta aparcada no está en
-- ninguna. Dónde estuvo lo cuenta el historial, cuyo tramo se cierra con motivo `parked`.
--
-- El ORDEN importa: la mesa se libera ANTES (`_table_free_by_session`), mientras la sesión todavía
-- sabe cuál era; si se vaciara primero, no habría a quién liberar.
UPDATE tables_session SET
    status     = 'parked',
    table_id   = NULL,
    updated_by = :current_user_id,
    updated_at = :now
WHERE id = :session_id AND hub_id = :hub_id AND is_deleted = 0 AND status = 'active';
