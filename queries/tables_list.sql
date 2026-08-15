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
       h.label      AS reserved_for,
       h.held_from  AS reserved_from,
       h.held_until AS reserved_until,
       h.party_size AS reserved_party_size
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
WHERE t.hub_id = :hub_id AND t.is_deleted = 0
