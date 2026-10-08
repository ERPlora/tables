-- One check (table session) by id, hub-scoped, with the bill (sales order) that hangs from it.
--
-- tables#124: `tables.sessions.close` preloads this row (`reads`, ADR-0069) so its handler can
-- refuse by code to free a table whose bill is still open in sales: the row says whether the
-- check is still open and WHICH bill it carries — the caller only names one.
SELECT s.id, s.table_id, s.status, s.order_id
FROM tables_session s
WHERE s.id = :session_id AND s.hub_id = :hub_id AND s.is_deleted = 0;
