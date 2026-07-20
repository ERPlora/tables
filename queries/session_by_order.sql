-- ADR-0141: resuelve la MESA de un pedido (lookup inverso por la junction). Lo consume `kitchen`
-- para enrutar la comanda como dine_in sin que `sales` tenga que llevar `table_id` en la venta.
SELECT s.id AS session_id, s.order_id, s.table_id, s.status,
       t.number AS table_number, t.name AS table_name, t.zone_id
FROM tables_session s
LEFT JOIN tables_table t ON t.id = s.table_id AND t.is_deleted = 0
WHERE s.order_id = :order_id AND s.hub_id = :hub_id AND s.is_deleted = 0
ORDER BY s.opened_at DESC;
