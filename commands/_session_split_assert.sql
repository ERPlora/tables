-- tables#12, dividir 5/5: assert de la división.
--
-- Solo es válida si la cadena entera aplicó: cuenta nueva `active` colgando de la origen
-- (`split_from_id`), la origen SIGUE `active` —dividir no cierra la cuenta de la que sales— y su
-- mesa quedó `occupied`. Origen inexistente, ya cerrada o aparcada sin mesa, o mesa destino
-- inactiva, dejan el CASE en 0, violan el CHECK (ok = 1) de `tables__gate` y revierten las tres
-- escrituras: ni cuenta nueva, ni tramo de historial, ni mesa tocada.
INSERT INTO tables__gate (gate, ok)
SELECT 'split_applied',
       CASE WHEN EXISTS (
           SELECT 1 FROM tables_session n
           JOIN tables_session o
             ON o.id = n.split_from_id AND o.hub_id = :hub_id AND o.status = 'active'
           JOIN tables_table t
             ON t.id = n.table_id AND t.hub_id = :hub_id AND t.status = 'occupied'
           WHERE n.id = :new_session_id AND n.hub_id = :hub_id
             AND n.status = 'active' AND n.split_from_id = :session_id
       ) THEN 1 ELSE 0 END;
