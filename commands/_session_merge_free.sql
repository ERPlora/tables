-- Check merge, step 2/3: frees the SOURCE table. The subquery only resolves if step 1 really
-- applied (source session `merged` with updated_at = :now in THIS transaction). The target table
-- is NOT touched: it stays `occupied` with its active session.
--
-- tables#118: like closing (tables#12), merging one account of a split table does NOT free it
-- while another account is still active there.
UPDATE tables_table SET
  status     = 'available',
  updated_by = :current_user_id,
  updated_at = :now
WHERE hub_id = :hub_id AND is_deleted = 0 AND status = 'occupied'
  AND id = (SELECT table_id FROM tables_session
            WHERE id = :session_id AND hub_id = :hub_id
              AND status = 'merged' AND updated_at = :now)
  AND NOT EXISTS (SELECT 1 FROM tables_session s2
                  WHERE s2.hub_id = :hub_id AND s2.table_id = tables_table.id
                    AND s2.status = 'active' AND s2.is_deleted = 0);
