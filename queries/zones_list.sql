-- Lista de zonas del hub. Runtime inyecta :hub_id.
-- Portado de TableService.list_zones (orden por sort_order, name).
SELECT id, name, color, sort_order, is_active
FROM tables_zone
WHERE hub_id = :hub_id AND is_deleted = 0
