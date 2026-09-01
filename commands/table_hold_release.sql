-- tables#12, soltar retención 1/2: la reserva se canceló, se movió de mesa o el cliente no vino.
--
-- YA NO es idempotente (tables#61). El command declara `expect_rows` anclado a ESTA sentencia, así
-- que soltar dos veces responde `tables.hold_not_found` en lugar de un `ok` mudo que además ponía
-- `tables.table.hold_released` en el bus por algo que no ocurrió. Un consumidor que reintente
-- tiene que tratar ese código como «ya estaba soltada», no como un fallo.
--
-- Solo toca las retenciones VIVAS: una ya `consumed` (la gente se sentó) no se degrada a
-- `released`, o perderíamos la traza de que aquella reserva sí llegó a ocupar la mesa.
UPDATE tables_table_hold SET
    status     = 'released',
    updated_by = :current_user_id,
    updated_at = :now
WHERE hub_id = :hub_id AND source = :source AND source_ref = :source_ref
  AND status = 'held' AND is_deleted = 0;
