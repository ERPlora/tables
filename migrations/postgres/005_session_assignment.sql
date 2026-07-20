-- ADR-0146 — historial de asignaciones de una sesión de servicio.
--
-- `tables_session.table_id` solo sabe DÓNDE ESTÁ AHORA una cuenta: al mover de la mesa 12 a la 8 se
-- sobrescribe y el paso por la 12 desaparece. Esta tabla es la FUENTE DE VERDAD de por dónde pasó
-- cada cuenta; aquella queda como proyección del estado actual. De aquí salen las estadísticas que
-- motivaron el ADR: ocupación por mesa, tiempo medio de servicio, movimientos, aparcados.
--
-- Append-only: los tramos no se borran ni se reescriben. Cada uno se abre con su motivo y se cierra
-- con el suyo, porque una asignación empieza por una razón y acaba por otra distinta:
--
--     Mesa 12  20:00 (opened)  → 20:45 (moved)
--     Mesa 8   20:45 (moved)   → 21:10 (parked)
--
-- Aparcar NO crea fila: cierra el tramo vivo con `release_reason='parked'`, así el periodo aparcado
-- no necesita inventarse una asignación a ninguna mesa.
--
-- Los motivos los deriva el HANDLER del comando ejecutado, nunca los manda la interfaz: el historial
-- no puede depender de que cada pantalla se acuerde de rellenar un campo.
CREATE TABLE IF NOT EXISTS tables_session_assignment (
    id                 TEXT PRIMARY KEY,
    hub_id             TEXT NOT NULL,
    session_id         TEXT NOT NULL,
    table_id           TEXT NOT NULL,
    assigned_at        TEXT NOT NULL,
    released_at        TEXT,
    -- Por qué EMPEZÓ este tramo.
    assignment_reason  TEXT NOT NULL,
    -- Por qué TERMINÓ. Vacío mientras sigue vivo.
    release_reason     TEXT NOT NULL DEFAULT '',
    -- Correlación e idempotencia: el relay puede reentregar y el camarero tocar dos veces. Un mismo
    -- `operation_id` es LA MISMA operación, no dos tramos.
    operation_id       TEXT NOT NULL,
    is_deleted         INTEGER NOT NULL DEFAULT 0,
    deleted_at         TEXT,
    created_by         TEXT,
    updated_by         TEXT,
    created_at         TEXT NOT NULL,
    updated_at         TEXT,
    CHECK (assignment_reason IN ('opened','assigned','moved','transferred','merged','restored','split')),
    CHECK (release_reason    IN ('','moved','parked','transferred','merged','closed','cancelled')),
    FOREIGN KEY (session_id) REFERENCES tables_session (id) ON DELETE CASCADE
);

-- LA invariante: una cuenta está en UNA mesa, no en dos. Sin esto volvemos al fallo que motivó el
-- ADR (tres mesas ocupadas por el mismo pedido, ninguna liberándose). Mover = cerrar el tramo vivo
-- y abrir el siguiente; nunca dos abiertos a la vez.
CREATE UNIQUE INDEX IF NOT EXISTS uq_session_assignment_activa
    ON tables_session_assignment (hub_id, session_id)
    WHERE released_at IS NULL AND is_deleted = 0;

-- Idempotencia por operación.
CREATE UNIQUE INDEX IF NOT EXISTS uq_session_assignment_operation
    ON tables_session_assignment (hub_id, operation_id);

-- Las estadísticas se leen por mesa y por tramo temporal.
CREATE INDEX IF NOT EXISTS ix_session_assignment_table   ON tables_session_assignment (hub_id, table_id, assigned_at);
CREATE INDEX IF NOT EXISTS ix_session_assignment_session ON tables_session_assignment (hub_id, session_id, assigned_at);

-- BACKFILL — los hubs en marcha ya tienen sesiones sin historial. Sin esto, esas mesas quedarían
-- fuera de las estadísticas para siempre. Se les crea su primer tramo a partir de lo que la sesión
-- ya sabía: cuándo se abrió y, si está cerrada, cuándo se cerró.
--
-- Idempotente (`WHERE NOT EXISTS`): reaplicar no duplica. Un backfill que duplica al reaplicarse es
-- peor que no tenerlo.
INSERT INTO tables_session_assignment (
    id, hub_id, session_id, table_id, assigned_at, released_at,
    assignment_reason, release_reason, operation_id, is_deleted, created_at
)
SELECT
    'bf-' || s.id,
    s.hub_id,
    s.id,
    s.table_id,
    s.opened_at,
    s.closed_at,
    'opened',
    CASE WHEN s.closed_at IS NULL THEN '' ELSE 'closed' END,
    'backfill-' || s.id,
    0,
    s.opened_at
FROM tables_session s
WHERE s.table_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM tables_session_assignment a
      WHERE a.session_id = s.id AND a.hub_id = s.hub_id
  );
