-- Fusión de comanda, paso 1/3. Lo invoca el handler WASM `merge_session` (command privado
-- `tables._session_merge`). Marca la sesión ORIGEN `merged` + closed_at = :now, fijando
-- merged_into_id = sesión ACTIVA de la mesa destino que la absorbe. Solo aplica si la origen
-- está `active`, la mesa destino es distinta de la origen y tiene sesión activa; si no, los
-- pasos siguientes quedan sin efecto y el assert revierte. Runtime inyecta :hub_id,
-- :current_user_id, :now.
-- tables#122: :target_session_id (opcional) nombra CUÁL cuenta del destino absorbe cuando la
-- mesa destino está dividida — el camarero la elige en el TPV. Ausente o vacía (NULLIF →
-- NULL → COALESCE = todas las filas) mantiene el comportamiento de siempre: la más reciente.
-- Una :target_session_id que no exista o ya no esté `active` vacía la subquery, merged_into_id
-- queda NULL y el assert del paso 3 revierte la fusión entera.
UPDATE tables_session SET
  status         = 'merged',
  closed_at      = :now,
  merged_into_id = (SELECT id FROM tables_session
                    WHERE hub_id = :hub_id AND table_id = :target_table_id
                      AND status = 'active' AND is_deleted = 0
                      AND id = COALESCE(NULLIF(CAST(:target_session_id AS TEXT), ''), id)
                    ORDER BY opened_at DESC LIMIT 1),
  updated_by     = :current_user_id,
  updated_at     = :now
WHERE id = :session_id AND hub_id = :hub_id AND is_deleted = 0
  AND status = 'active'
  AND table_id <> :target_table_id
  AND EXISTS (SELECT 1 FROM tables_session
              WHERE hub_id = :hub_id AND table_id = :target_table_id
                AND status = 'active' AND is_deleted = 0);
