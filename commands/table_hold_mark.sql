-- tables#12, retener mesa 2/2: pinta la mesa `reserved` en el plano.
--
-- Solo desde `available`. Una mesa OCUPADA no se repinta: la gente que está comiendo manda sobre la
-- reserva de dentro de dos horas, y machacar su estado dejaría la sala mintiendo. Cuando esa gente
-- pague, la mesa vuelve a `available` y el sweep/plano ya ven la retención viva.
--
-- `blocked` tampoco se toca: lo puso una persona a propósito.
UPDATE tables_table SET
    status     = 'reserved',
    updated_by = :current_user_id,
    updated_at = :now
WHERE hub_id = :hub_id AND is_deleted = 0 AND status = 'available'
  AND id = (SELECT h.table_id FROM tables_table_hold h
            WHERE h.hub_id = :hub_id AND h.source = :source AND h.source_ref = :source_ref
              AND h.status = 'held' AND h.is_deleted = 0);
