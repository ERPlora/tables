-- tables#12, dividir 3/5: ocupa la mesa donde se sienta la cuenta nueva.
--
-- Cuando la división se queda en la misma mesa esto no cambia nada (ya estaba `occupied`); cuando
-- media mesa se muda a otra libre, es lo que la marca en el plano. Una sola sentencia para los dos
-- casos: la mesa de la cuenta nueva es la que hay que ocupar, venga de donde venga.
UPDATE tables_table SET
  status     = 'occupied',
  updated_by = :current_user_id,
  updated_at = :now
WHERE hub_id = :hub_id AND is_deleted = 0 AND status <> 'occupied'
  AND id = (SELECT s.table_id FROM tables_session s
            WHERE s.id = :new_session_id AND s.hub_id = :hub_id AND s.status = 'active');
