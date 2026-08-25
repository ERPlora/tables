-- Lista de mesas del hub con nombre de zona. Runtime inyecta :hub_id.
-- Portado de TableService.list_tables (orden por número de mesa).
--
-- tables#12 — la reserva en el plano. El QA proponía joinear aquí las reservas confirmadas del día,
-- pero `reservations_reservation` es de OTRO módulo y el contrato §2.5 prohíbe tocarla (`tables`
-- declara `depends_on: []`: sin `reservations` instalado, ese JOIN no compila). La reserva entra
-- por donde debe: quien reserva pide una RETENCIÓN a `tables` —autoridad de ocupación— y aquí solo
-- se lee la retención propia.
--
-- Se saca la retención viva más próxima: sin nombre ni hora, «Reservada» es un color y el encargado
-- no sabe ni de quién es ni si le da tiempo a sentar a alguien antes. El LATERAL devuelve UNA fila
-- por mesa, así que no multiplica el listado paginado.
SELECT t.id, t.number, t.name, t.capacity, t.shape, t.status, t.is_active,
       t.position_x, t.position_y, t.width, t.height,
       t.zone_id, z.name AS zone,
       -- tables#182: clave de ORDEN NATURAL. La lista de mesas se pagina en el servidor, así que
       -- su orden se decide aquí y no en el navegador: ordenar la página visible en JS ordenaría
       -- cada página por su cuenta y seguiría partiendo las páginas por la clave equivocada. Con
       -- el orden de texto, un salón S1…S12 salía `S1 · S10 · S11 · S12 · S2 …` y la mesa 2
       -- quedaba la quinta. Regla POR FILA (la misma que el TPV aplica con
       -- `Intl.Collator(..., { numeric: true })`): si el nombre acaba en dígitos, esa cola se
       -- compara como número —se rellena con ceros a la izquierda, y `GREATEST` evita que `lpad`
       -- RECORTE una cola de más de 12 dígitos—; si no, se queda tal cual, en alfabético.
       CASE WHEN t.number ~ '[0-9]+$'
            THEN regexp_replace(t.number, '[0-9]+$', '')
                 || lpad(substring(t.number FROM '[0-9]+$'),
                         GREATEST(12, length(substring(t.number FROM '[0-9]+$'))), '0')
            ELSE t.number
       END AS number_sort,
       h.label      AS reserved_for,
       h.held_from  AS reserved_from,
       h.held_until AS reserved_until,
       h.party_size AS reserved_party_size,
       -- tables#32: covers of the LIVE party (the oldest open check of the table — the one that
       -- opened the service; a split table shows the original party). NULL on a free table. The
       -- POS paints it on the table cell next to the capacity and pre-fills the correction.
       g.guests_count AS live_guests
FROM tables_table t
LEFT JOIN tables_zone z ON z.id = t.zone_id AND z.is_deleted = 0 AND z.hub_id = :hub_id
LEFT JOIN LATERAL (
    SELECT hh.label, hh.held_from, hh.held_until, hh.party_size
    FROM tables_table_hold hh
    WHERE hh.hub_id = t.hub_id AND hh.table_id = t.id
      AND hh.status = 'held' AND hh.is_deleted = 0
    ORDER BY hh.held_from ASC
    LIMIT 1
) h ON TRUE
LEFT JOIN LATERAL (
    SELECT s.guests_count
    FROM tables_session s
    WHERE s.hub_id = t.hub_id AND s.table_id = t.id
      AND s.status = 'active' AND s.is_deleted = 0
    ORDER BY s.opened_at ASC, s.id ASC
    LIMIT 1
) g ON TRUE
WHERE t.hub_id = :hub_id AND t.is_deleted = 0
