-- reservations#13, listener 2/4: the reservation was cancelled or the guest never came → release.
--
-- Same rule as `tables.tables.release_hold`: only a LIVE hold (`held`) is released; a `consumed`
-- one (they sat down) keeps its trace. `_hold_free_stale` (run right after) gives the table back
-- to the plan at once, without waiting for the 15-minute sweep.
UPDATE tables_table_hold SET
    status     = 'released',
    -- pm#637: a hold that is over keeps no name — no screen reads it any more.
    label      = '',
    updated_by = :current_user_id,
    updated_at = :now
WHERE hub_id = :hub_id AND source = 'reservations' AND source_ref = CAST(:reservation_id AS TEXT)
  AND status = 'held' AND is_deleted = 0
  AND CAST(:status AS TEXT) IN ('cancelled', 'no_show');
