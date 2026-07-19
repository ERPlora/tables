-- ADR-0146 — una cuenta APARCADA no está en ninguna mesa. `table_id` = mesa ACTUAL; NULL = ninguna.
-- En Postgres es directo: no hace falta reconstruir la tabla, así que la FK del historial no
-- estorba (en SQLite sí, y por eso allí se reconstruye en dos pasos).
ALTER TABLE tables_session ALTER COLUMN table_id DROP NOT NULL;
