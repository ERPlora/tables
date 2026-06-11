-- Soft-delete de zona CON guarda de integridad (WASM-TODO §delete_zone).
-- Lo invoca el handler WASM `delete_zone` (command privado `tables._zone_delete`).
-- Solo aplica si la zona NO tiene mesas activas (is_active=1, is_deleted=0);
-- si tiene, el UPDATE queda sin efecto y el assert revierte (`tables_attached`).
-- Runtime inyecta :hub_id, :current_user_id, :now.
UPDATE tables_zone SET
  is_deleted = 1,
  is_active  = 0,
  deleted_at = :now,
  updated_by = :current_user_id,
  updated_at = :now
WHERE id = :zone_id AND hub_id = :hub_id AND is_deleted = 0
  AND NOT EXISTS (
        SELECT 1 FROM tables_table t
        WHERE t.hub_id = :hub_id AND t.zone_id = :zone_id
          AND t.is_deleted = 0 AND t.is_active = 1);
