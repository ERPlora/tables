-- Zones of the hub with their occupancy (tables#3 / tables#4). Runtime injects :hub_id.
-- Ported from TableService.list_zones (ordered by sort_order, name — the list wrapper sorts).
--
-- The Zones screen needs, per zone, how many tables it has and how many are free RIGHT NOW: every
-- reference (Square "Sections", Toast "Service areas", Lightspeed "Floor plans", Clover/Revel/
-- TouchBistro "Sections", Odoo "Floors") lists the section together with its tables. The counts
-- come from a LEFT JOIN + COUNT so the list stays one row per zone (an empty zone counts 0) and
-- the UI never has to fetch every table of the hub to paint a number. Soft-deleted tables and
-- tables of another hub never count.
--
-- `description` rides along so the edit form does not need a second `zones.get` round-trip.
SELECT z.id, z.name, z.description, z.color, z.sort_order, z.is_active,
       COUNT(t.id)                                            AS table_count,
       COUNT(t.id) FILTER (WHERE t.status = 'available')      AS available_tables_count
FROM tables_zone z
LEFT JOIN tables_table t
       ON t.zone_id = z.id AND t.hub_id = z.hub_id AND t.is_deleted = 0 AND t.is_active = 1
WHERE z.hub_id = :hub_id AND z.is_deleted = 0
GROUP BY z.id, z.name, z.description, z.color, z.sort_order, z.is_active
