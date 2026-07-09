-- Assert de la transferencia: solo es válida si la cadena completa aplicó —
-- sesión nueva `active` en destino (enlazada a la origen) Y mesa destino
-- `occupied`. Sesión origen no `active`, o mesa destino inexistente/inactiva/no
-- `available`, dejan el AND en 0, violan el CHECK (ok = 1) de tables__gate y
-- revierten la transacción completa (las 4 escrituras).
INSERT INTO tables__gate (gate, ok)
SELECT 'transfer_applied',
       CASE WHEN EXISTS (SELECT 1 FROM tables_session
               WHERE id = :new_session_id AND hub_id = :hub_id
                 AND status = 'active' AND transferred_from_id = :session_id) THEN 1 ELSE 0 END
       AND EXISTS (SELECT 1 FROM tables_table
                   WHERE id = :target_table_id AND hub_id = :hub_id
                     AND status = 'occupied');
