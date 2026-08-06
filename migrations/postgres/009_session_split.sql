-- 009_session_split.sql — tables#12: dividir la cuenta.
--
-- Hasta aquí una mesa tenía UNA sesión viva, y por tanto UNA cuenta: cuatro comensales que querían
-- pagar por separado no tenían por dónde. Dividir abre una SEGUNDA sesión activa sobre la misma
-- mesa; `split_from_id` dice de cuál salió, igual que `transferred_from_id` dice de dónde vino una
-- transferencia y `merged_into_id` en qué acabó una fusión. El linaje se lee en la misma columna
-- que ya usaban los otros dos movimientos de sala.
--
-- Las líneas y los importes NO viven aquí: los OWNea `sales`. `tables` aporta la segunda cuenta y
-- su sitio en la mesa; `sales` engancha su pedido nuevo a esa sesión con `tables.sessions.link_order`.
ALTER TABLE tables_session ADD COLUMN IF NOT EXISTS split_from_id TEXT;

CREATE INDEX IF NOT EXISTS ix_sessions_split_from
    ON tables_session (hub_id, split_from_id);

-- Con dos cuentas vivas en una mesa, «las sesiones activas de esta mesa» pasa a ser una lectura
-- caliente: la ejecutan el cierre, la liberación por pedido y el enlace del pedido, todos en la
-- transacción de cada cobro.
CREATE INDEX IF NOT EXISTS ix_sessions_live_by_table
    ON tables_session (hub_id, table_id, status);
