-- 003_session_merge.sql — fusión de comandas (punto 3 del flujo de sala del POS).
-- Paridad Postgres de la migración sqlite: añade el linaje de fusión a tables_session
-- (`merged` como estado terminal + `merged_into_id` a la sesión activa del destino).
ALTER TABLE tables_session ADD COLUMN IF NOT EXISTS merged_into_id TEXT;
CREATE INDEX IF NOT EXISTS ix_sessions_merged_into ON tables_session (hub_id, merged_into_id);
