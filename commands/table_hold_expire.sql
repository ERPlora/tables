-- tables#12, barrido 1/2: vence las retenciones cuya ventana ya pasó.
--
-- El no-show es el caso normal, no el raro. Sin este barrido, una reserva de las 21:00 a la que
-- nadie viene deja la mesa pintada `reserved` hasta que alguien se acuerde de tocarla a mano — es
-- decir, la deja muerta el resto del servicio. Lo dispara `scheduled_tasks` cada cuarto de hora.
--
-- `expired` y `released` se distinguen a propósito: soltar es una decisión (cancelaron), vencer es
-- que se acabó el tiempo. Sin la distinción, no hay forma de contar los no-shows.
UPDATE tables_table_hold SET
    status     = 'expired',
    updated_by = :current_user_id,
    updated_at = :now
WHERE hub_id = :hub_id AND status = 'held' AND is_deleted = 0
  AND held_until < :now;
