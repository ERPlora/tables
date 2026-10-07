-- tables#12: sentar gente en una mesa CONSUME la retención que la reservaba.
--
-- Una sola sentencia para los CUATRO caminos que acaban con alguien sentado —abrir, transferir,
-- dividir y recuperar una cuenta aparcada—, porque el hecho es el mismo: en esa mesa ya hay
-- clientes, luego la reserva que la esperaba dejó de esperar. Escribirla cuatro veces era garantizar
-- que uno de los cuatro se olvidara y dejara la retención colgando: el barrido de vencidas la
-- contaría como no-show y `_hold_free_stale` intentaría devolver al plano una mesa con gente comiendo.
--
-- `consumed` y no `released` porque es el dato que separa una reserva CUMPLIDA de una cancelada.
--
-- La sesión que acaba de sentarse es `:new_session_id` cuando el command creó una (transferir,
-- dividir) y `:session_id` cuando reusa la que ya existía (abrir, recuperar). El COALESCE resuelve
-- cuál de las dos sin que cada llamante necesite su propia copia — mismo patrón que el
-- `COALESCE(NULLIF(:operation_id, ''), :new_id)` del historial.
--
-- El filtro por sesión ACTIVA es la guarda: todas esas escrituras son condicionales, así que sin
-- ella consumiríamos la retención de una mesa donde no llegó a entrar nadie. Y al ir por la mesa de
-- ESA sesión (y no por todas las retenciones vivas) no tocamos la reserva de las 22:00 de una mesa
-- distinta.
UPDATE tables_table_hold SET
    status     = 'consumed',
    -- pm#637: a hold that is over keeps no name — no screen reads it any more.
    label      = '',
    updated_by = :current_user_id,
    updated_at = :now
WHERE hub_id = :hub_id AND status = 'held' AND is_deleted = 0
  AND table_id = (
      SELECT s.table_id FROM tables_session s
      WHERE s.hub_id = :hub_id AND s.is_deleted = 0 AND s.status = 'active'
        AND s.id = COALESCE(
              NULLIF(CAST(:new_session_id AS TEXT), ''),
              CAST(:session_id AS TEXT))
  );
