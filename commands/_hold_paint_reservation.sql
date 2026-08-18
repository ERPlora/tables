-- reservations#13, listener 3/4: paint the held table `reserved` on the plan.
--
-- Twin of `table_hold_mark.sql` keyed by the reservation (the event has no `source`/`source_ref`
-- of its own — the key IS `('reservations', reservation_id)`). Same guards: only from `available`
-- (people eating beat the booking of two hours from now; `blocked` was put there on purpose).
UPDATE tables_table SET
    status     = 'reserved',
    updated_by = :current_user_id,
    updated_at = :now
WHERE hub_id = :hub_id AND is_deleted = 0 AND status = 'available'
  AND id = (SELECT h.table_id FROM tables_table_hold h
            WHERE h.hub_id = :hub_id AND h.source = 'reservations'
              AND h.source_ref = CAST(:reservation_id AS TEXT)
              AND h.status = 'held' AND h.is_deleted = 0);
