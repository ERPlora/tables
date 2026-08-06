-- tables#12, soltar retención 1/2: la reserva se canceló, se movió de mesa o el cliente no vino.
--
-- Idempotente: soltar dos veces no rompe nada (el segundo UPDATE no encuentra fila `held`). Solo
-- toca las retenciones VIVAS: una ya `consumed` (la gente se sentó) no se degrada a `released`, o
-- perderíamos la traza de que aquella reserva sí llegó a ocupar la mesa.
UPDATE tables_table_hold SET
    status     = 'released',
    updated_by = :current_user_id,
    updated_at = :now
WHERE hub_id = :hub_id AND source = :source AND source_ref = :source_ref
  AND status = 'held' AND is_deleted = 0;
