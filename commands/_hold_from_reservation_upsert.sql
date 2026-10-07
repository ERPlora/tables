-- reservations#13, listener 1/4: a reservation just got CONFIRMED with a table → hold it.
--
-- Payload = the event `reservations.reservation.status_changed`, enriched by `reservations` from
-- its own row (`table_id, date, time, duration_minutes, party_size, guest_name, customer_id, status`). This is
-- the door `tables` already uses for `order.completed`: the runtime forbids `reservations` from
-- calling `tables.tables.hold` directly, so it announces the fact and `tables` holds its own table.
--
-- Same natural key as `tables.tables.hold` — `(hub_id, 'reservations', reservation_id)` — so a
-- redelivered confirmation does not hold twice, and a confirmation for another table MOVES the
-- hold instead of adding a second one. Only `confirmed` holds; a walk-in without a table (NULL /
-- '') holds nothing; `seated`/`completed` are the session's business (`_hold_consume_seated`).
--
-- The window is the booking itself: `held_from` = date+time, `held_until` = + duration (default
-- 120 min if the event carries none). Wall-clock text in the same shape `expire_holds` compares
-- against `:now` (`YYYY-MM-DDTHH:MM:SS…`).
INSERT INTO tables_table_hold (
    id, hub_id, table_id, source, source_ref, held_from, held_until,
    party_size, label, customer_id, status, is_deleted, created_by, updated_by, created_at, updated_at
)
SELECT
    :new_id, :hub_id, t.id, 'reservations', CAST(:reservation_id AS TEXT),
    -- `timestamp::text` is `YYYY-MM-DD HH:MI:SS` (DateStyle ISO); the `T` makes it the same shape
    -- `expire_holds` compares with `:now` (`YYYY-MM-DDTHH:MI:SS…`). No `to_char` (not portable).
    replace(CAST(w.starts_at AS TEXT), ' ', 'T'),
    replace(CAST(w.ends_at AS TEXT), ' ', 'T'),
    COALESCE(CAST(:party_size AS INTEGER), 0), COALESCE(CAST(:guest_name AS TEXT), ''),
    -- pm#637: whose name it is, so `customer.anonymized` can find it ('' = no sheet).
    COALESCE(CAST(:customer_id AS TEXT), ''), 'held',
    0, :current_user_id, :current_user_id, :now, :now
FROM tables_table t
CROSS JOIN (
    SELECT starts_at,
           starts_at + make_interval(mins => COALESCE(CAST(:duration_minutes AS INTEGER), 120)) AS ends_at
    FROM (SELECT CAST(CAST(:date AS TEXT) || ' ' || CAST(:time AS TEXT) AS TIMESTAMP) AS starts_at) b
) w
WHERE CAST(:status AS TEXT) = 'confirmed'
  AND CAST(:date AS TEXT) IS NOT NULL AND CAST(:time AS TEXT) IS NOT NULL
  AND t.id = CAST(:table_id AS TEXT) AND t.hub_id = :hub_id AND t.is_deleted = 0 AND t.is_active = 1
ON CONFLICT (hub_id, source, source_ref) DO UPDATE SET
    table_id   = EXCLUDED.table_id,
    held_from  = EXCLUDED.held_from,
    held_until = EXCLUDED.held_until,
    party_size = EXCLUDED.party_size,
    label      = EXCLUDED.label,
    customer_id = EXCLUDED.customer_id,
    status     = 'held',
    is_deleted = 0,
    updated_by = EXCLUDED.updated_by,
    updated_at = EXCLUDED.updated_at;
