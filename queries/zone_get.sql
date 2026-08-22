-- Una zona por id (scope hub_id). Portado de TableService.get_zone.
--
-- tables#55: arrastra `table_count` — las mesas VIVAS de la zona (activas y no borradas), que es
-- exactamente la condición que guarda `_zone_delete_update.sql`. Sin este dato el handler de
-- `tables.zones.delete` no podía rechazar «esta zona tiene mesas» con un código propio y el
-- hostelero acababa leyendo la violación del CHECK de `tables__gate`. Mismo criterio de conteo que
-- `zones_list.sql`, para que el número del diálogo y el de la guarda no puedan discrepar.
SELECT z.id, z.name, z.description, z.color, z.sort_order, z.is_active,
       (SELECT COUNT(*) FROM tables_table t
        WHERE t.hub_id = z.hub_id AND t.zone_id = z.id
          AND t.is_deleted = 0 AND t.is_active = 1) AS table_count
FROM tables_zone z
WHERE z.id = :zone_id AND z.hub_id = :hub_id AND z.is_deleted = 0;
