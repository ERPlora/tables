-- ADR-0146 — retira el CASCADE heredado que se lleva el historial (issue #21).
--
-- `005_session_assignment.sql` creó la FK del historial con
--     FOREIGN KEY (session_id) REFERENCES tables_session (id) ON DELETE CASCADE
-- pensando que `006_session_no_table.sql` la neutralizaría. Pero en SQLite el `DROP NOT NULL` obliga
-- a RECONSTRUIR la tabla en dos pasos, y en ese rebuild el historial se recrea SIN la FK (ver
-- `sqlite/006_session_no_table.sql`, retirado con ADR-0154): la referencia `session_id` queda como
-- referencia opaca (contrato §2.5) y borrar una sesión ya NO borra su historia.
--
-- En Postgres `006` es un simple `ALTER COLUMN ... DROP NOT NULL`, sin rebuild, así que el CASCADE
-- de `005` SOBREVIVE: `DELETE FROM tables_session` cascadea y se lleva el historial —justo la fuente
-- de verdad que el ADR construyó—. Divergencia real entre dialectos.
--
-- Esta hoja replica la semántica que dejó SQLite: se ELIMINA la FK del todo (no se recrea). Las
-- invariantes reales del historial son sus índices únicos, no la FK. La FK inline de `005` la nombra
-- Postgres de forma determinista: `<tabla>_<columna>_fkey`.
ALTER TABLE tables_session_assignment
    DROP CONSTRAINT IF EXISTS tables_session_assignment_session_id_fkey;
