-- Lista de sesiones de mesa (activas o histórico). Runtime inyecta :hub_id.
-- Portado de TableService.list_sessions (orden por opened_at desc, limit 20).
-- Nota: duration_minutes (legacy property) se calcula en la UI/WASM, no en SQL.
SELECT s.id, s.table_id, t.number AS table_number, s.guests_count, s.status,
       s.waiter_id, s.opened_at, s.closed_at, s.notes,
       -- ADR-0141: pedido enlazado a esta mesa (junction). El POS lo usa para REANUDAR la comanda.
       s.order_id,
       -- tables#12: de qué cuenta salió esta, si la mesa tiene la cuenta dividida. El TPV lo
       -- necesita para listar las cuentas de una mesa como cuentas y no como sesiones sueltas.
       s.split_from_id,
       -- tables#3 (Sessions view): the zone of the table the session sits on, resolved through
       -- the table (a session only knows its table_id). `zone_id` feeds the `eq` filter ("what is
       -- open on the terrace"), `zone` is for the eye. NULL for a parked check (no table).
       t.zone_id,
       z.name AS zone,
       -- tables#96: what the check's order CHARGED, in cents — its sales minus the voided ones,
       -- from tables' own ledger (migration 012; `sales` is never joined, contract §2.5). NULL when
       -- nothing was charged yet (an open check) or the sale predates the ledger: the screen reads
       -- «—» for both, never a fake 0,00. CAST: Postgres sums a BIGINT into NUMERIC, which the
       -- runtime serialises as the STRING '250' (caught by session_history.hub.test.py).
       CAST((SELECT SUM(p.total) FROM tables_order_payment p
             WHERE p.hub_id = :hub_id AND p.order_id = s.order_id
               AND p.status = 'paid' AND p.is_deleted = 0) AS BIGINT) AS paid_total
FROM tables_session s
LEFT JOIN tables_table t ON t.id = s.table_id AND t.is_deleted = 0 AND t.hub_id = :hub_id
LEFT JOIN tables_zone z ON z.id = t.zone_id AND z.is_deleted = 0 AND z.hub_id = :hub_id
WHERE s.hub_id = :hub_id AND s.is_deleted = 0
