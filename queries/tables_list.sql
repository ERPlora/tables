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
       -- tables#182 / tables#68: NATURAL sort key. The tables list is paginated by the SERVER, so
       -- its order is decided here and not in the browser: sorting the visible page in JS would
       -- order each page on its own and still cut the pages by the wrong key. Under the plain text
       -- order a room named S1…S12 came out `S1 · S10 · S11 · S12 · S2 …` and table 2 sat in the
       -- fifth slot.
       --
       -- The rule is PER ROW and it is the SAME one the POS applies with
       -- `Intl.Collator(..., { numeric: true })`: EVERY run of digits compares as a number,
       -- wherever it sits in the label; anything else stays alphabetical. tables#68: this used to
       -- pad only the run at the END, so `Barra 2 Bis` and `Barra 10 Bis` came out one way in this
       -- list and the opposite way in the picker — the very incoherence between screens tables#182
       -- set out to remove, hiding in a label that ends in text. `tests/natural-order-corpus.json`
       -- is the shared corpus that keeps the two sides honest.
       --
       -- Two passes, and no database object of our own: Postgres cannot call a function per regexp
       -- match, so pass 1 prefixes EVERY run with 12 zeros and pass 2 keeps the last 12 digits of
       -- each (now over-long) run. A run longer than 12 digits comes out untruncated and therefore
       -- still sorts after every shorter one, which is what `GREATEST(12, …)` used to buy.
       regexp_replace(
           regexp_replace(t.number, '([0-9]+)', '000000000000\1', 'g'),
           '0*([0-9]{12})', '\1', 'g'
       ) AS number_sort,
       h.label      AS reserved_for,
       -- pm#637: whose hold it is. An erased customer's hold keeps its id and loses its name, and
       -- the screen says «Deleted customer» for it instead of hiding the reservation.
       h.customer_id AS reserved_customer_id,
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
    SELECT hh.label, hh.customer_id, hh.held_from, hh.held_until, hh.party_size
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
