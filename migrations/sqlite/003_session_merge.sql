-- 003_session_merge.sql — fusión de comandas (punto 3 del flujo de sala del POS).
-- Añade el linaje de fusión a tables_session: cuando la comanda de una mesa se FUSIONA en
-- otra mesa ocupada, la sesión origen queda en el nuevo estado terminal `merged` (junto a
-- active|closed|transferred) y `merged_into_id` apunta a la sesión ACTIVA del destino que la
-- absorbió. Paralelo a `transferred_from_id`. Ref. opaca (sin FK, como el resto de refs blandas):
-- ON DELETE del origen no arrastra al destino.
ALTER TABLE tables_session ADD COLUMN merged_into_id TEXT;
CREATE INDEX IF NOT EXISTS ix_sessions_merged_into ON tables_session (hub_id, merged_into_id);
