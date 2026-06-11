-- Assert del alta en lote: la fila solo es válida si el INSERT condicional aplicó
-- (la zona destino existe). Zona inexistente o borrada deja EXISTS=0, viola el
-- CHECK (ok = 1) de tables__gate y revierte el lote completo (todas las mesas).
INSERT INTO tables__gate (gate, ok)
SELECT 'zone_exists',
       EXISTS (SELECT 1 FROM tables_table
               WHERE id = :table_id AND hub_id = :hub_id);
