-- tables#12, dividir la cuenta 1/5: abre la SEGUNDA cuenta.
--
-- Cuatro comensales que quieren pagar por separado no tenían por dónde: una mesa = una sesión =
-- una cuenta. Dividir crea una sesión hermana, viva a la vez que la original, con `split_from_id`
-- apuntando a ella (el mismo linaje que `transferred_from_id` y `merged_into_id`).
--
-- Nace SIN `order_id` a propósito. El pedido lo materializa `sales` cuando le carguen la primera
-- línea y lo engancha con `tables.sessions.link_order` pasando ESTA sesión. `tables` no inventa
-- pedidos: solo aporta el sitio en la mesa donde colgarlos.
--
-- Mesa destino: `:target_table_id` si lo mandan (la mitad del grupo se muda a una mesa libre) y la
-- MISMA mesa si no (el caso normal: dos cuentas, un mantel). Por eso la mesa admite `occupied` —
-- está ocupada por la cuenta que estamos dividiendo—, además de `available`/`reserved` para el
-- caso de mudanza.
--
-- Condicional como el resto: solo materializa si la cuenta origen sigue `active` y la mesa es
-- sentable. Si no, no inserta y el assert revierte.
INSERT INTO tables_session
  (id, hub_id, table_id, opened_at, closed_at, guests_count, waiter_id,
   status, notes, transferred_from_id, split_from_id, order_id,
   is_deleted, created_by, updated_by, created_at, updated_at)
SELECT
  :new_session_id, :hub_id, t.id, :now, NULL,
  COALESCE(:guests_count, 1), s.waiter_id,
  'active', COALESCE(CAST(:notes AS TEXT), ''), NULL, s.id, NULL,
  0, :current_user_id, :current_user_id, :now, :now
FROM tables_session s
JOIN tables_table t
  ON t.id = COALESCE(NULLIF(CAST(:target_table_id AS TEXT), ''), s.table_id)
 AND t.hub_id = :hub_id AND t.is_deleted = 0 AND t.is_active = 1
 AND t.status IN ('available', 'reserved', 'occupied')
WHERE s.id = :session_id AND s.hub_id = :hub_id AND s.is_deleted = 0
  AND s.status = 'active' AND s.table_id IS NOT NULL;
