-- tables#12, retener mesa 1/2: graba la retención que pide otro módulo (hoy `reservations`).
--
-- IDEMPOTENTE por la clave natural `(hub_id, source, source_ref)`: el outbox es at-least-once y la
-- misma confirmación llega dos veces. Sin el `ON CONFLICT` tendríamos dos retenciones para una sola
-- reserva y la mesa se quedaría retenida al soltar solo una.
--
-- Reabrir una retención ya soltada es legítimo (se canceló y se rehízo la reserva), así que el
-- UPDATE la devuelve a `held`.
INSERT INTO tables_table_hold (
    id, hub_id, table_id, source, source_ref, held_from, held_until,
    party_size, label, status, is_deleted, created_by, updated_by, created_at, updated_at
)
SELECT
    :new_id, :hub_id, t.id, :source, :source_ref, :held_from, :held_until,
    COALESCE(:party_size, 0), COALESCE(CAST(:label AS TEXT), ''), 'held',
    0, :current_user_id, :current_user_id, :now, :now
FROM tables_table t
WHERE t.id = :table_id AND t.hub_id = :hub_id AND t.is_deleted = 0 AND t.is_active = 1
ON CONFLICT (hub_id, source, source_ref) DO UPDATE SET
    table_id   = EXCLUDED.table_id,
    held_from  = EXCLUDED.held_from,
    held_until = EXCLUDED.held_until,
    party_size = EXCLUDED.party_size,
    label      = EXCLUDED.label,
    status     = 'held',
    is_deleted = 0,
    updated_by = EXCLUDED.updated_by,
    updated_at = EXCLUDED.updated_at;
