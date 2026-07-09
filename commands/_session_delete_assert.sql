-- Assert de la guarda de estado: el borrado solo es válido si el UPDATE condicional
-- realmente aplicó (sesión soft-deleted con deleted_at = :now). Sesión inexistente o
-- todavía `active` deja EXISTS=0, viola el CHECK (ok = 1) de tables__gate y revierte
-- la transacción completa.
INSERT INTO tables__gate (gate, ok)
SELECT 'session_not_active',
       CASE WHEN EXISTS (SELECT 1 FROM tables_session
               WHERE id = :session_id AND hub_id = :hub_id
                 AND is_deleted = 1 AND deleted_at = :now) THEN 1 ELSE 0 END;
