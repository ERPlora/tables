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
       -- tables#182: NATURAL sort key. The tables list is paginated by the SERVER, so its order is
       -- decided here and not in the browser: sorting the visible page in JS would order each page
       -- on its own and still cut the pages by the wrong key. Under the plain text order a room
       -- named S1…S12 came out `S1 · S10 · S11 · S12 · S2 …` and table 2 sat in the fifth slot.
       -- The rule is PER ROW (the same one the POS applies with
       -- `Intl.Collator(..., { numeric: true })`): a number ending in digits has that tail
       -- compared as a number — left-padded with zeros, and `GREATEST` keeps `lpad` from
       -- TRUNCATING a tail longer than 12 digits; anything else stays as it is, alphabetical.
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
       g.guests_count AS live_guests,
       -- tables#74 / tables#64: the same live check answers the two questions a floor manager asks
       -- of an occupied table — WHO is serving it and HOW LONG it has been sitting. `live_waiter_id`
       -- stays OPAQUE on purpose (ADR-0192): the name is presentation and belongs to the core, so
       -- the plan resolves it through `hub.users.list`, never with a JOIN against `hub_user`.
       g.waiter_id     AS live_waiter_id,
       g.opened_at     AS live_since
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
    SELECT s.guests_count, s.waiter_id, s.opened_at
    FROM tables_session s
    WHERE s.hub_id = t.hub_id AND s.table_id = t.id
      AND s.status = 'active' AND s.is_deleted = 0
    ORDER BY s.opened_at ASC, s.id ASC
    LIMIT 1
) g ON TRUE
WHERE t.hub_id = :hub_id AND t.is_deleted = 0
