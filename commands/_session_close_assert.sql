-- Assert de la guarda de estado: el cierre solo es válido si el UPDATE condicional
-- realmente aplicó (sesión `closed` con closed_at = :now). Sesión inexistente o ya
-- `closed`/`transferred` deja EXISTS=0, viola el CHECK (ok = 1) de tables__gate y
-- revierte la transacción completa.
INSERT INTO tables__gate (gate, ok)
SELECT 'session_active',
       EXISTS (SELECT 1 FROM tables_session
               WHERE id = :session_id AND hub_id = :hub_id
                 AND status = 'closed' AND closed_at = :now);
