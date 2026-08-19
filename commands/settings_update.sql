-- Upsert of the room settings (singleton per hub). Runtime injects :new_id, :hub_id,
-- :current_user_id, :now. The UI sends the COMPLETE snapshot (the shell's settings form builds it
-- from schema defaults + current row); ON CONFLICT (hub_id) updates the existing row.
INSERT INTO tables_settings
  (id, hub_id, prompt_guests_on_seat, timer_warning_minutes, timer_critical_minutes,
   is_deleted, created_by, updated_by, created_at, updated_at)
VALUES
  (:new_id, :hub_id, :prompt_guests_on_seat, :timer_warning_minutes, :timer_critical_minutes,
   0, :current_user_id, :current_user_id, :now, :now)
ON CONFLICT (hub_id) DO UPDATE SET
  prompt_guests_on_seat  = excluded.prompt_guests_on_seat,
  timer_warning_minutes  = excluded.timer_warning_minutes,
  timer_critical_minutes = excluded.timer_critical_minutes,
  updated_by             = :current_user_id,
  updated_at             = :now;
