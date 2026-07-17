-- Assert de la fusión (paso 3/3): válida solo si la sesión origen quedó `merged` en ESTA
-- transacción, con merged_into_id resuelto (la mesa destino tenía sesión activa) y esa sesión
-- destino sigue `active`. Si la origen no estaba `active`, era la misma mesa, o el destino no
-- tenía sesión activa, el CASE da 0, viola el CHECK (ok = 1) de tables__gate y revierte los 2
-- pasos anteriores.
INSERT INTO tables__gate (gate, ok)
SELECT 'merge_applied',
       CASE WHEN EXISTS (
           SELECT 1 FROM tables_session o
           WHERE o.id = :session_id AND o.hub_id = :hub_id
             AND o.status = 'merged' AND o.updated_at = :now
             AND o.merged_into_id IS NOT NULL
             AND EXISTS (SELECT 1 FROM tables_session tgt
                         WHERE tgt.id = o.merged_into_id AND tgt.hub_id = :hub_id
                           AND tgt.status = 'active')
       ) THEN 1 ELSE 0 END;
