-- Assert de la guarda `tables_attached`: el borrado solo es válido si el UPDATE
-- condicional realmente aplicó (zona soft-deleted con deleted_at = :now — el :now
-- es idéntico en todos los statements del mismo command). Zona inexistente o con
-- mesas activas deja EXISTS=0, viola el CHECK (ok = 1) de tables__gate y revierte
-- la transacción completa.
INSERT INTO tables__gate (gate, ok)
SELECT 'zone_without_active_tables',
       EXISTS (SELECT 1 FROM tables_zone
               WHERE id = :zone_id AND hub_id = :hub_id
                 AND is_deleted = 1 AND deleted_at = :now);
