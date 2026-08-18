-- reservations#13, edit listener: `reservations.reservation.updated` carries the fields the
-- caller SENT to `reservations.reservations.update` (`NULL` = untouched, `''` on `table_id` =
-- unassign — the two sentinels of that command). Editing never CREATES a hold: a `pending`
-- reservation edited with a table stays unheld until it is confirmed. It only MOVES or releases a
-- LIVE one, so the plan follows the booking without a second confirmation.
UPDATE tables_table_hold SET
    table_id   = CASE WHEN CAST(:table_id AS TEXT) <> '' THEN CAST(:table_id AS TEXT) ELSE table_id END,
    status     = CASE WHEN CAST(:table_id AS TEXT) = ''  THEN 'released' ELSE status END,
    updated_by = :current_user_id,
    updated_at = :now
WHERE hub_id = :hub_id AND source = 'reservations' AND source_ref = CAST(:reservation_id AS TEXT)
  AND status = 'held' AND is_deleted = 0
  AND CAST(:table_id AS TEXT) IS NOT NULL
  AND (CAST(:table_id AS TEXT) = ''
       OR EXISTS (SELECT 1 FROM tables_table t
                  WHERE t.id = CAST(:table_id AS TEXT) AND t.hub_id = :hub_id
                    AND t.is_deleted = 0 AND t.is_active = 1));
