-- Assert de la guarda `not_available`: la apertura solo es válida si la sesión se
-- insertó Y la mesa quedó `occupied`. Mesa inexistente, inactiva o no `available`
-- deja el AND en 0, viola el CHECK (ok = 1) de tables__gate y revierte la
-- transacción completa (no queda ni sesión ni mesa ocupada).
INSERT INTO tables__gate (gate, ok)
SELECT 'table_available',
       EXISTS (SELECT 1 FROM tables_session
               WHERE id = :session_id AND hub_id = :hub_id AND status = 'active')
       AND EXISTS (SELECT 1 FROM tables_table
                   WHERE id = :table_id AND hub_id = :hub_id AND status = 'occupied');
