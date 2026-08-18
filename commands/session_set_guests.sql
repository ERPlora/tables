-- tables#32: correct the covers of an OPEN check (a fifth guest arrives, two leave before
-- ordering). Only `active` sessions: a closed/transferred/merged check is history and keeps the
-- covers it was served with. `guests_count >= 1` is enforced by the payload schema.
UPDATE tables_session
SET guests_count = :guests_count, updated_by = :current_user_id, updated_at = :now
WHERE id = :session_id AND hub_id = :hub_id AND status = 'active' AND is_deleted = 0;
