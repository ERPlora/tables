-- Crea una mesa resolviendo su zona contra el hub inyectado (pm#146).
--
-- `zone_id` venía del payload sin comprobar nada, así que una mesa de este hub podía quedar
-- apuntando a una zona del vecino. La mitad de lectura se cerró en pm#89 (el JOIN de `tables_list`
-- sobre `tables_zone` lleva ya la igualdad de hub), pero eso deja de ENSEÑAR la fila cruzada: no
-- impide crearla.
--
-- La zona es OPCIONAL —una mesa suelta sin zona es legítima—, así que la guarda tiene dos ramas:
-- sin zona pasa, y con zona la zona tiene que ser de este hub y estar viva. Si no, no se
-- selecciona nada y `expect_rows` lo convierte en un error de negocio en vez de un OK mentiroso.
INSERT INTO tables_table
  (id, hub_id, zone_id, number, name, capacity, position_x, position_y,
   width, height, shape, status, is_active,
   is_deleted, created_by, updated_by, created_at, updated_at)
SELECT
  :new_id, :hub_id, :zone_id, :number, :name, :capacity, :position_x, :position_y,
  :width, :height, :shape, 'available', 1,
  0, :current_user_id, :current_user_id, :now, :now
WHERE COALESCE(NULLIF(CAST(:zone_id AS TEXT), ''), '') = ''
   OR EXISTS (
        SELECT 1 FROM tables_zone z
        WHERE z.id = :zone_id AND z.hub_id = :hub_id AND z.is_deleted = 0
      );
