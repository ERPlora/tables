-- Reposiciona/redimensiona una mesa en el plano (canvas editor del módulo, Tier 0). Solo toca
-- posición y tamaño; el resto de campos se editan con tables.tables.update. Runtime inyecta
-- :hub_id, :current_user_id, :now y aísla por hub_id.
UPDATE tables_table SET
  position_x = :position_x,
  position_y = :position_y,
  width = :width,
  height = :height,
  updated_by = :current_user_id,
  updated_at = :now
WHERE id = :table_id AND hub_id = :hub_id AND is_deleted = 0;
