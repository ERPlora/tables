-- PG-compat (auditoría pm#16, 07-17): los binds BOOLEANOS del schema van envueltos en
-- CASE WHEN :x THEN 1 WHEN NOT :x THEN 0 END — las columnas son INTEGER 0/1 por contrato
-- (§2.5) y Postgres NO castea boolean→bigint (SQLite sí lo toleraba). El tri-estado
-- preserva NULL para los COALESCE de opcionales.
-- Edición de mesa (campos editables; la UI envía el conjunto completo, Tier 0).
-- Portado de TableService.update_table SIN sus guardas (validación de estado y
-- bloqueo de desactivación con sesión activa viven en WASM — ver WASM-TODO.md).
UPDATE tables_table SET
  number = :number,
  name = :name,
  capacity = :capacity,
  zone_id = :zone_id,
  shape = :shape,
  status = :status,
  is_active = CASE WHEN :is_active THEN 1 WHEN NOT :is_active THEN 0 END,
  updated_by = :current_user_id,
  updated_at = :now
WHERE id = :table_id AND hub_id = :hub_id AND is_deleted = 0;
