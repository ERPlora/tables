-- 004_session_order.sql — ADR-0141: `tables_session` pasa a ser la JUNCTION mesa↔pedido.
-- La asociación la OWNea `tables` (satélite que depende de `sales`), NO `sales`: la venta deja de
-- llevar `table_id`. `order_id` apunta al pedido abierto (sales_order.id); opaco, sin FK cross-módulo
-- (contrato §2.5: los módulos no referencian tablas de otros). NULL = mesa ocupada sin pedido aún.
ALTER TABLE tables_session ADD COLUMN order_id TEXT;
CREATE INDEX IF NOT EXISTS ix_sessions_order ON tables_session (hub_id, order_id);
