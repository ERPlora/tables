-- Tables · esquema inicial (Postgres / Aurora cloud). Equivalente a
-- migrations/sqlite/001_init.sql — mismas tablas, índices, FK y contrato de fila del
-- hub (§2.5): hub_id + soft-delete + auditoría. Generado por paridad mecánica.
--
-- Tipos: subconjunto portable "ERPlora SQL" (ADR-0007):
--   * ids/refs → TEXT (UUIDs del runtime como texto);
--   * flags 0/1 → INTEGER (los commands bindean 0/1; Postgres no castea entero→bool);
--   * importes → NUMERIC;
--   * FECHAS → TEXT ISO-8601 (NO TIMESTAMPTZ): el motor de sync (ADR-0031) compara
--     updated_at como string lexicográfico; timestamptz rompería el LWW entre dialectos.

CREATE TABLE IF NOT EXISTS tables_zone (
    id          TEXT PRIMARY KEY,
    hub_id      TEXT NOT NULL,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    color       TEXT NOT NULL DEFAULT 'primary',
    sort_order  INTEGER NOT NULL DEFAULT 0,
    is_active   INTEGER NOT NULL DEFAULT 1,
    is_deleted  INTEGER NOT NULL DEFAULT 0,
    deleted_at  TEXT,
    created_by  TEXT,
    updated_by  TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT
);
CREATE INDEX IF NOT EXISTS idx_tables_zone_hub    ON tables_zone (hub_id, is_deleted);
CREATE INDEX IF NOT EXISTS ix_tables_zone_order   ON tables_zone (hub_id, sort_order);
CREATE INDEX IF NOT EXISTS ix_tables_zone_active  ON tables_zone (hub_id, is_active);

-- Mesa física del restaurante (posición en el plano + estado).
CREATE TABLE IF NOT EXISTS tables_table (
    id          TEXT PRIMARY KEY,
    hub_id      TEXT NOT NULL,
    zone_id     TEXT,
    number      TEXT NOT NULL,
    name        TEXT NOT NULL DEFAULT '',
    capacity    INTEGER NOT NULL DEFAULT 4,
    position_x  INTEGER NOT NULL DEFAULT 0,
    position_y  INTEGER NOT NULL DEFAULT 0,
    width       INTEGER NOT NULL DEFAULT 10,
    height      INTEGER NOT NULL DEFAULT 10,
    shape       TEXT NOT NULL DEFAULT 'square',     -- square|round|rectangle
    status      TEXT NOT NULL DEFAULT 'available',  -- available|occupied|reserved|blocked
    is_active   INTEGER NOT NULL DEFAULT 1,
    is_deleted  INTEGER NOT NULL DEFAULT 0,
    deleted_at  TEXT,
    created_by  TEXT,
    updated_by  TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT,
    FOREIGN KEY (zone_id) REFERENCES tables_zone (id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_tables_table_hub     ON tables_table (hub_id, is_deleted);
CREATE INDEX IF NOT EXISTS ix_tables_hub_status     ON tables_table (hub_id, status);
CREATE INDEX IF NOT EXISTS ix_tables_hub_active     ON tables_table (hub_id, is_active);
CREATE INDEX IF NOT EXISTS ix_tables_table_zone     ON tables_table (hub_id, zone_id);

-- Sesión de cliente en una mesa (servicio en curso / histórico).
CREATE TABLE IF NOT EXISTS tables_session (
    id                   TEXT PRIMARY KEY,
    hub_id               TEXT NOT NULL,
    table_id             TEXT NOT NULL,
    opened_at            TEXT NOT NULL,
    closed_at            TEXT,
    guests_count         INTEGER NOT NULL DEFAULT 1,
    waiter_id            TEXT,
    status               TEXT NOT NULL DEFAULT 'active',  -- active|closed|transferred
    notes                TEXT NOT NULL DEFAULT '',
    transferred_from_id  TEXT,
    is_deleted           INTEGER NOT NULL DEFAULT 0,
    deleted_at           TEXT,
    created_by           TEXT,
    updated_by           TEXT,
    created_at           TEXT NOT NULL,
    updated_at           TEXT,
    FOREIGN KEY (table_id)            REFERENCES tables_table (id)   ON DELETE CASCADE,
    FOREIGN KEY (transferred_from_id) REFERENCES tables_session (id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_tables_session_hub     ON tables_session (hub_id, is_deleted);
CREATE INDEX IF NOT EXISTS ix_sessions_hub_status     ON tables_session (hub_id, status);
CREATE INDEX IF NOT EXISTS ix_sessions_hub_opened     ON tables_session (hub_id, opened_at);
CREATE INDEX IF NOT EXISTS ix_sessions_table          ON tables_session (hub_id, table_id);