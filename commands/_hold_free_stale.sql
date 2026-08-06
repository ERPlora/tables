-- tables#12: devuelve al plano toda mesa que sigue pintada `reserved` sin razón viva.
--
-- Una sola sentencia para los DOS caminos que dejan de retener —soltar la reserva y vencer la
-- ventana—, porque la pregunta es la misma: «¿queda algo que justifique el color?». Escribirla dos
-- veces era garantizar que una de las dos se olvidara de mirar las sesiones.
--
-- Las dos guardas son la parte importante:
--   · sin retención `held` viva → ninguna otra reserva sigue esperando esa mesa;
--   · sin sesión `active` → nadie está sentado. Una mesa retenida a la que luego sentaron gente
--     NO puede volver a `available` al vencer la retención; el cliente sigue ahí.
UPDATE tables_table SET
    status     = 'available',
    updated_by = :current_user_id,
    updated_at = :now
WHERE hub_id = :hub_id AND is_deleted = 0 AND status = 'reserved'
  AND NOT EXISTS (SELECT 1 FROM tables_table_hold h
                  WHERE h.hub_id = :hub_id AND h.table_id = tables_table.id
                    AND h.status = 'held' AND h.is_deleted = 0)
  AND NOT EXISTS (SELECT 1 FROM tables_session s
                  WHERE s.hub_id = :hub_id AND s.table_id = tables_table.id
                    AND s.status = 'active' AND s.is_deleted = 0);
