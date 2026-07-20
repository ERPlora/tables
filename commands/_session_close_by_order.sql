-- ADR-0146: cierra la sesión enlazada a un pedido que acaba de terminar (cobrado o anulado).
--
-- Antes alguien tenía que acordarse de cerrar la sesión a mano y, cuando no lo hacía, la mesa se
-- quedaba ocupada para siempre. Ahora lo dispara el propio pedido: `tables` escucha el fin del
-- PEDIDO —no el de la venta, que también ocurre en un cobro parcial— y suelta lo suyo.
--
-- Idempotente: el relay puede reentregar; si la sesión ya está cerrada, no toca ninguna fila.
UPDATE tables_session SET
    status     = 'closed',
    closed_at  = :now,
    updated_by = :current_user_id,
    updated_at = :now
WHERE hub_id = :hub_id AND order_id = :order_id AND status = 'active' AND is_deleted = 0;
