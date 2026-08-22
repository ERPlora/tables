-- ADR-0146: marca ocupada la mesa donde se acaba de sentar una cuenta recuperada.
--
-- tables#54: era la ÚNICA sentencia incondicional del command, y por eso la que neutralizaba su
-- guarda — ocupar una mesa siempre afectaba a una fila, así que la suma del `expect_rows` nunca
-- bajaba de 1 y `tables.session.restored` salía al bus aunque la cuenta no estuviera aparcada
-- (hub#1091). Ahora exige el hecho que dice proyectar: que ESA cuenta esté sentada en ESA mesa
-- tras el UPDATE anterior. Y no repinta una mesa ya ocupada: si otra cuenta sigue viva ahí (mesa
-- con cuenta dividida), el estado ya es el correcto.
UPDATE tables_table SET
    status     = 'occupied',
    updated_by = :current_user_id,
    updated_at = :now
WHERE id = :table_id AND hub_id = :hub_id AND is_deleted = 0 AND status <> 'occupied'
  AND EXISTS (SELECT 1 FROM tables_session s
              WHERE s.id = :session_id AND s.hub_id = :hub_id AND s.is_deleted = 0
                AND s.status = 'active' AND s.table_id = :table_id);
