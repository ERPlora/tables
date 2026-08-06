-- tables#12 — el defecto que rompía el servicio: transferir NO re-apuntaba la comanda.
--
-- El paso 3 COPIA el `order_id` a la sesión nueva, pero la origen se lo quedaba también. Resultado:
-- dos filas de `tables_session` reclamando el mismo pedido. Y como `_table_free_by_order` libera
-- «las mesas de las sesiones con ese pedido», cobrar la cuenta que se había movido vaciaba TAMBIÉN
-- la mesa que la gente había dejado — con la parroquia siguiente ya sentada en ella. La mesa
-- desaparecía del plano estando llena.
--
-- La invariante: un pedido lo posee UNA sola sesión. La copia del paso 3 y este UPDATE son las dos
-- mitades de un movimiento, no de una duplicación; van en la misma transacción, así que en ningún
-- instante visible el pedido está en dos sitios ni en ninguno.
--
-- El orden importa: esto va DESPUÉS del INSERT, que es quien lee `s.order_id` de la origen. Si se
-- limpiara antes, la sesión nueva nacería sin pedido y la comanda se perdería del todo.
UPDATE tables_session SET
    order_id   = NULL,
    updated_by = :current_user_id,
    updated_at = :now
WHERE id = :session_id AND hub_id = :hub_id AND is_deleted = 0
  AND status = 'transferred' AND updated_at = :now
  AND EXISTS (SELECT 1 FROM tables_session n
              WHERE n.id = :new_session_id AND n.hub_id = :hub_id AND n.status = 'active');
