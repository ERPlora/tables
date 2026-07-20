-- Apertura de sesión CON gate de disponibilidad (WASM-TODO §open_session).
-- Lo invoca el handler WASM `open_session` (command privado `tables._session_open`).
-- El INSERT condicional solo materializa la sesión si la mesa existe, está activa
-- y en estado `available`, evaluado contra datos vivos DENTRO de la transacción.
-- Si no, no inserta nada y el assert revierte (`not_available`).
-- El handler pasa :session_id (de context.new_ids) y el payload normalizado.
-- Runtime inyecta :hub_id, :current_user_id, :now.
INSERT INTO tables_session
  (id, hub_id, table_id, opened_at, closed_at, guests_count, waiter_id,
   status, notes, transferred_from_id, order_id,
   is_deleted, created_by, updated_by, created_at, updated_at)
SELECT
  :session_id, :hub_id, t.id, :now, NULL,
  COALESCE(:guests_count, 1), :waiter_id,
  'active', COALESCE(:notes, ''), NULL, :order_id,
  0, :current_user_id, :current_user_id, :now, :now
FROM tables_table t
WHERE t.id = :table_id AND t.hub_id = :hub_id
  AND t.is_deleted = 0 AND t.is_active = 1 AND t.status = 'available';
