-- Assert de la guarda `active_sessions`: el borrado solo es válido si el UPDATE
-- condicional realmente aplicó (mesa soft-deleted con deleted_at = :now). Mesa
-- inexistente o con sesión activa deja EXISTS=0, viola el CHECK (ok = 1) de
-- tables__gate y revierte la transacción completa.
INSERT INTO tables__gate (gate, ok)
SELECT 'table_without_active_sessions',
       EXISTS (SELECT 1 FROM tables_table
               WHERE id = :table_id AND hub_id = :hub_id
                 AND is_deleted = 1 AND deleted_at = :now);
