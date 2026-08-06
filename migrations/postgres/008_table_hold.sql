-- 008_table_hold.sql — tables#12: la reserva confirmada RESERVA la mesa en el plano.
--
-- `tables_table.status` ya admitía `reserved` desde 001, pero NADIE lo escribía nunca: la leyenda
-- «Reservada» del plano era inalcanzable (QA restaurante 07-16). El origen del dato está en otro
-- módulo (`reservations`), y el contrato §2.5 prohíbe que `tables` joinee su tabla. La salida no es
-- el JOIN que sugería el QA: es que `tables` —AUTORIDAD de ocupación— guarde SU propia retención y
-- que quien reserva se la pida.
--
-- Una retención NO es una sesión: nadie se ha sentado. Por eso tabla propia y no una fila en
-- `tables_session`, que significa «hay gente en la mesa» y arrastra aforo, camarero e historial.
CREATE TABLE IF NOT EXISTS tables_table_hold (
    id           TEXT PRIMARY KEY,
    hub_id       TEXT NOT NULL,
    table_id     TEXT NOT NULL,
    -- Quién pidió la retención y sobre qué fila suya. Referencia OPACA (contrato §2.5): `tables`
    -- no sabe qué es una reserva, solo que alguien identificable la pidió y puede soltarla.
    source       TEXT NOT NULL,
    source_ref   TEXT NOT NULL,
    -- Ventana de la retención. `held_until` es lo que impide que un no-show deje la mesa muerta
    -- el resto de la noche: pasada esa hora la barre `tables.tables.expire_holds`.
    held_from    TEXT NOT NULL,
    held_until   TEXT NOT NULL,
    party_size   INTEGER NOT NULL DEFAULT 0,
    -- Lo que el plano PINTA sobre la mesa: sin un nombre, un color no es una reserva.
    label        TEXT NOT NULL DEFAULT '',
    status       TEXT NOT NULL DEFAULT 'held',
    is_deleted   INTEGER NOT NULL DEFAULT 0,
    deleted_at   TEXT,
    created_by   TEXT,
    updated_by   TEXT,
    created_at   TEXT NOT NULL,
    updated_at   TEXT,
    -- `held` retiene · `consumed` la gente se sentó · `released` la soltaron (cancelada, movida)
    -- · `expired` se pasó la hora y la barrió el sweep.
    CHECK (status IN ('held', 'consumed', 'released', 'expired'))
);

-- Idempotencia del handoff: el outbox es at-least-once y una confirmación reentregada NO puede
-- retener la mesa dos veces. La clave natural es de quién viene, no un id que invente el caller.
CREATE UNIQUE INDEX IF NOT EXISTS uq_table_hold_source
    ON tables_table_hold (hub_id, source, source_ref);

-- Las dos lecturas del día: «¿esta mesa está retenida?» (plano) y «¿qué retenciones ya vencieron?»
-- (sweep).
CREATE INDEX IF NOT EXISTS ix_table_hold_live
    ON tables_table_hold (hub_id, table_id, status);
CREATE INDEX IF NOT EXISTS ix_table_hold_window
    ON tables_table_hold (hub_id, status, held_until);
