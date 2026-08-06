-- Transferencia de sesión, paso 3/4: crea la sesión nueva en la mesa destino
-- copiando guests_count/waiter_id/notes de la sesión origen (autoridad = fila,
-- no el cliente), con transferred_from_id = sesión origen. Solo materializa si
-- la mesa destino existe, está activa y `available` (evaluado tras liberar la
-- origen, dentro de ESTA transacción). El handler pasa :new_session_id
-- (de context.new_ids).
-- ADR-0141: la sesión nueva ARRASTRA el `order_id` de la origen. Transferir una mesa NO mueve la
-- comanda: mueve a qué mesa apunta el MISMO pedido, así que los productos se conservan solos (antes
-- el carrito era un blob por table_id y había que copiarlo; ahora solo viaja la asociación).
-- El pedido queda en las DOS filas hasta que `_session_transfer_detach_order` (paso siguiente) lo
-- suelta de la origen: la copia se hace aquí porque después ya no habría de dónde copiarlo.
--
-- tables#12: la mesa destino puede estar `reserved`. La reserva de esta noche no impide mover a la
-- gente ahí (llegan, los sientas en la 3 y los pasas a su mesa); `_hold_consume_seated` da la
-- retención por cumplida en la misma transacción.
INSERT INTO tables_session
  (id, hub_id, table_id, opened_at, closed_at, guests_count, waiter_id,
   status, notes, transferred_from_id, order_id,
   is_deleted, created_by, updated_by, created_at, updated_at)
SELECT
  :new_session_id, :hub_id, t.id, :now, NULL,
  s.guests_count, s.waiter_id,
  'active', s.notes, s.id, s.order_id,
  0, :current_user_id, :current_user_id, :now, :now
FROM tables_session s
JOIN tables_table t
  ON t.id = :target_table_id AND t.hub_id = :hub_id
 AND t.is_deleted = 0 AND t.is_active = 1 AND t.status IN ('available', 'reserved')
WHERE s.id = :session_id AND s.hub_id = :hub_id
  AND s.status = 'transferred' AND s.updated_at = :now;
