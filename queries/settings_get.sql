-- Room settings of the hub (singleton). Runtime injects :hub_id. No row yet → no rows: the shell's
-- settings form and the module's own consumers fall back to the schema defaults.
SELECT id, prompt_guests_on_seat, timer_warning_minutes, timer_critical_minutes
FROM tables_settings
WHERE hub_id = :hub_id AND is_deleted = 0
LIMIT 1
