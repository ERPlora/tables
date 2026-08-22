-- One table by id (hub-scoped), with the fact its guards turn on: how many checks are OPEN on it.
--
-- tables#55: the Tier-2 commands of this module used to carry their guard ONLY in the internal
-- SQL (conditional write + assert on `tables__gate`, ADR-0020), so what aborted was Postgres'
-- CHECK — and the host served the raw sqlx text to a restaurant owner, identical for all three
-- guards. `expect_rows` cannot cover them: the affected-rows gate does not count the operations a
-- handler returns (tasks#26). So the guard moves to where the handler can see it — the rows the
-- runtime preloads (`reads`, ADR-0069) — and this is that row.
--
-- `active_session_count` is a scalar subquery and not a JOIN + GROUP BY on purpose: the row must
-- come back even when the table has no session at all (the common case, and the one that must be
-- allowed through). Since tables#12 a table can hold MORE THAN ONE live check (a split bill), so
-- it is a count, never a boolean.
SELECT t.id, t.zone_id, t.number, t.name, t.capacity, t.shape, t.status, t.is_active,
       t.position_x, t.position_y, t.width, t.height,
       (SELECT COUNT(*) FROM tables_session s
        WHERE s.hub_id = t.hub_id AND s.table_id = t.id
          AND s.status = 'active' AND s.is_deleted = 0) AS active_session_count
FROM tables_table t
WHERE t.id = :table_id AND t.hub_id = :hub_id AND t.is_deleted = 0;
