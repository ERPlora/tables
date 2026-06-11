-- Alta de UNA mesa del lote (WASM-TODO §bulk_create_tables). Lo invoca el handler
-- WASM `bulk_create_tables` N veces (una intención por mesa), con :table_id de
-- context.new_ids y number/posición calculados en el guest. Solo materializa si
-- la zona destino existe y no está borrada; si no, el assert revierte el lote
-- completo. Runtime inyecta :hub_id, :current_user_id, :now.
INSERT INTO tables_table
  (id, hub_id, zone_id, number, name, capacity, position_x, position_y,
   width, height, shape, status, is_active,
   is_deleted, created_by, updated_by, created_at, updated_at)
SELECT
  :table_id, :hub_id, :zone_id, :number, COALESCE(:name, ''),
  COALESCE(:capacity, 4), :position_x, :position_y,
  COALESCE(:width, 10), COALESCE(:height, 10),
  COALESCE(:shape, 'square'), 'available', 1,
  0, :current_user_id, :current_user_id, :now, :now
WHERE EXISTS (SELECT 1 FROM tables_zone z
              WHERE z.id = :zone_id AND z.hub_id = :hub_id AND z.is_deleted = 0);
