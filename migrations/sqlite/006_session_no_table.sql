-- ADR-0146 — una cuenta APARCADA no está en ninguna mesa, y el esquema lo dice.
--
-- `table_id` pasa a admitir NULL, y con eso la columna recupera un significado simple:
--
--     mesa ACTUAL de la sesión; NULL = no está asignada a ninguna mesa.
--
-- La alternativa era dejarla `NOT NULL` conservando «la última mesa», que obligaba a recordar para
-- siempre que esa columna no significa lo que parece. Se corrige ahora, sin datos reales ni
-- clientes: es cuando sale gratis.
--
-- SQLite no sabe quitar un `NOT NULL`: hay que reconstruir la tabla. Y aquí está la trampa que
-- obliga a hacerlo en DOS pasos y en este orden:
--
--     `tables_session_assignment` tenía `FOREIGN KEY (session_id) → tables_session ON DELETE
--     CASCADE`. Con las FK activas —lo están—, el `DROP TABLE tables_session` del rebuild hace un
--     DELETE implícito que CASCADEA y se lleva el historial entero por delante: justo la fuente de
--     verdad que este ADR acaba de construir.
--
-- Por eso primero se reconstruye el historial SIN esa FK (nadie lo referencia, así que su DROP es
-- inofensivo) y solo después la sesión. El historial no pierde garantías: sus invariantes reales
-- son los índices únicos, no la FK, y `session_id` es el tipo de referencia opaca que describe el
-- contrato §2.5. Como efecto secundario deseable, borrar una sesión ya no borra su historia.

-- ── 1) Historial sin la FK en cascada ────────────────────────────────────────────────────────
CREATE TABLE tables_session_assignment_new (
    id                 TEXT PRIMARY KEY,
    hub_id             TEXT NOT NULL,
    session_id         TEXT NOT NULL,
    table_id           TEXT NOT NULL,
    assigned_at        TEXT NOT NULL,
    released_at        TEXT,
    assignment_reason  TEXT NOT NULL,
    release_reason     TEXT NOT NULL DEFAULT '',
    operation_id       TEXT NOT NULL,
    is_deleted         INTEGER NOT NULL DEFAULT 0,
    deleted_at         TEXT,
    created_by         TEXT,
    updated_by         TEXT,
    created_at         TEXT NOT NULL,
    updated_at         TEXT,
    CHECK (assignment_reason IN ('opened','assigned','moved','transferred','merged','restored','split')),
    CHECK (release_reason    IN ('','moved','parked','transferred','merged','closed','cancelled'))
);
INSERT INTO tables_session_assignment_new
SELECT id, hub_id, session_id, table_id, assigned_at, released_at, assignment_reason,
       release_reason, operation_id, is_deleted, deleted_at, created_by, updated_by,
       created_at, updated_at
FROM tables_session_assignment;
DROP TABLE tables_session_assignment;
ALTER TABLE tables_session_assignment_new RENAME TO tables_session_assignment;

CREATE UNIQUE INDEX uq_session_assignment_activa
    ON tables_session_assignment (hub_id, session_id)
    WHERE released_at IS NULL AND is_deleted = 0;
CREATE UNIQUE INDEX uq_session_assignment_operation
    ON tables_session_assignment (hub_id, operation_id);
CREATE INDEX ix_session_assignment_table   ON tables_session_assignment (hub_id, table_id, assigned_at);
CREATE INDEX ix_session_assignment_session ON tables_session_assignment (hub_id, session_id, assigned_at);

-- ── 2) La sesión, ya sin nadie que cascadee, con `table_id` anulable ─────────────────────────
CREATE TABLE tables_session_new (
    id                   TEXT PRIMARY KEY,
    hub_id               TEXT NOT NULL,
    -- Mesa ACTUAL. NULL = aparcada: viva, pero en ninguna mesa.
    table_id             TEXT,
    opened_at            TEXT NOT NULL,
    closed_at            TEXT,
    guests_count         INTEGER NOT NULL DEFAULT 1,
    waiter_id            TEXT,
    status               TEXT NOT NULL DEFAULT 'active',  -- active|parked|closed|transferred
    notes                TEXT NOT NULL DEFAULT '',
    transferred_from_id  TEXT,
    order_id             TEXT,
    is_deleted           INTEGER NOT NULL DEFAULT 0,
    deleted_at           TEXT,
    created_by           TEXT,
    updated_by           TEXT,
    created_at           TEXT NOT NULL,
    updated_at           TEXT
);
INSERT INTO tables_session_new
SELECT id, hub_id, table_id, opened_at, closed_at, guests_count, waiter_id, status, notes,
       transferred_from_id, order_id, is_deleted, deleted_at, created_by, updated_by,
       created_at, updated_at
FROM tables_session;
DROP TABLE tables_session;
ALTER TABLE tables_session_new RENAME TO tables_session;

CREATE INDEX ix_sessions_table  ON tables_session (hub_id, table_id, status);
CREATE INDEX ix_sessions_order  ON tables_session (hub_id, order_id);
CREATE INDEX ix_sessions_status ON tables_session (hub_id, status, is_deleted);
