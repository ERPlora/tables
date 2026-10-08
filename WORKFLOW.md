# WORKFLOW — Mesas

Prefijo: TABLES
Alcance MVP: restaurante

> Contrato de comportamiento del módulo (pm#620, pm#621). Se lee antes de tocar el código y se
> actualiza en la misma PR que cambie un comportamiento. El detalle técnico vive en
> `architecture/modules/tables.md`; aquí se escribe lo que ve y hace la persona.

## Para qué sirve y para quién

Mesas es el plano del restaurante o del bar: las zonas del local (salón, terraza, barra), las mesas
de cada zona con su aforo y su sitio en el plano, y las cuentas que hay sentadas en cada mesa. Dice
qué mesa está libre, ocupada, reservada o fuera de servicio, y es la que sabe qué cuenta de Ventas
está en qué mesa. El **responsable** de sala dibuja el plano (el **administrador** además borra mesas
y zonas y cambia los ajustes); el **empleado** (camarero) y el **cajero** sientan a la gente, cambian de
mesa, juntan o dividen cuentas desde el TPV. No cobra (eso es Ventas), no apunta reservas (eso es
Reservas) y no es la pantalla de cocina (eso es Cocina): Mesas les pone la mesa.

## Referencia adoptada

Contrastada en `.claude/agents/qa-hub-restaurant.md` §2 (10/08/2026); se adopta esto, no más:

- [Square — planos de sala](https://squareup.com/help/us/en/article/6427-building-your-floor-plan):
  zonas, mesas colocadas en un plano, comensales por mesa y ocupación a la vista. De Square se copia
  también el color del tiempo que lleva una cuenta abierta (ámbar y rojo tras N minutos).
- [OpenTable — gestión de sala](https://www.opentable.com/restaurant-solutions/products/table-management/):
  la reserva confirmada aparece en su mesa del plano y el estado de la mesa sigue a la reserva.
- [Lightspeed — dividir una cuenta](https://resto-support.lightspeedhq.com/hc/en-us/articles/226405708-Splitting-a-bill)
  y [Square — dividir por artículo](https://squareup.com/help/gb/en/article/8421-new-order-and-pay-capabilities-with-square-for-restaurants):
  varias cuentas en una mesa; las líneas las reparte Ventas.
- De Toast y Lightspeed (por su nombre en `architecture/modules/tables.md`, sin enlace contrastado):
  pedir los comensales al sentar, transferir y juntar cuentas, sacar una mesa del servicio
  («bloquearla») y la lista de cuentas cerradas con su importe.
- Comportamiento de sala del mercado que se adopta: sentar en una mesa reservada está permitido y
  gasta la reserva; superar el aforo avisa pero no impide.

## Antes de empezar

- Mesas no necesita a nadie para instalarse. Con **Ventas** aparece el botón de mesa en el TPV y las
  mesas se liberan solas al cobrar; con **Reservas**, las reservas confirmadas se ven en el plano;
  con **Cocina**, el TPV no deja cambiar de mesa con productos sin enviar.
- La puesta en marcha del hub muestra el paso opcional «Tus mesas»: se da por hecho en cuanto hay al
  menos una mesa en uso, y lleva a **Mesas → Mesas**.

Configuración inicial, paso a paso:

1. En **Mesas → Zonas** (o con el «+» del **Plano de sala**) crea las zonas del local (TABLES-F01).
2. En **Mesas → Plano de sala**, con el «+», añade las mesas de cada zona (TABLES-F02).
3. Arrástralas hasta que el plano se parezca a la sala y ajusta en cada una su aforo y su forma
   (TABLES-F03, TABLES-F04).
4. En **Mesas → Ajustes** (solo el administrador) decide si al sentar se preguntan los comensales y a
   partir de cuántos minutos una cuenta abierta se pone ámbar y roja (TABLES-F08).
5. En **Ventas → Vender** pulsa el botón de mesa y comprueba que salen tus zonas y tus mesas.

## Pantallas

El menú **Mesas** tiene cuatro pestañas propias y la pestaña **Ajustes** que pone el hub. Ninguna
pestaña se esconde por permiso. En **Zonas** y **Sesiones** no salen los botones que el perfil no
puede usar; en **Plano de sala** y **Mesas** salen a todos, y el hub rechaza la orden o pide el PIN de
un responsable (TABLES-F02). Además, Mesas pone en **Ventas → Vender** la ventana «Elegir mesa».

### Plano de sala
Menú **Mesas → Plano de sala**. Arriba, una sola fila: la tira de zonas (se desliza de lado en el
móvil y se difumina por el borde cuando hay más zonas), un «+» («Añadir zona o mesa») y un lápiz
(«Editar zona»). Debajo, el plano de la zona elegida, con las mesas a su tamaño real: si no cabe
de ancho (móvil, tableta) se desliza de lado y el borde con mesas detrás se difumina, como la tira
de zonas; si no cabe de alto, crece y se baja la página. Cada mesa es una baldosa con su número, su
estado escrito con su icono y color (Disponible, Ocupada, Reservada, Bloqueada), el aforo («4 pax»)
o, si está ocupada, los comensales y los minutos que llevan («3 pax · 35 min») y quién la atiende; si
tiene una reserva retenida, el nombre y la hora de la reserva («Cliente borrado» si se borraron
los datos de esa clienta, TABLES-F31) en una línea: un nombre que no cabe se recorta con «…» y la
hora se ve siempre entera («Maximiliana F… · 20:00»); el nombre completo va en el título de la
mesa. Las mesas redondas se pintan
redondas; la rectangular se pinta igual que la cuadrada. Debajo, la ayuda «Arrastra para colocar ·
clic en una mesa para editarla o borrarla. Los cambios se guardan al momento.».
Tocar una mesa abre **Editar mesa** (Número, Aforo, Nombre (opcional), Forma, Estado, Zona; pie con
«Borrar» y «Guardar»); el «+» abre **Añadir** (campo Zona y «Añadir zona»; campo «Número de mesa»,
que si se deja vacío «Se numera sola», y «Añadir mesa»); el lápiz abre **Editar zona** (Nombre,
Descripción (opcional); «Borrar zona» y «Guardar»). Las tres son ventanas que tapan toda la pantalla
en el móvil y van centradas en tableta y ordenador.
Vacío: «Crea una zona para empezar a colocar mesas.»; zona sin mesas: «Sin mesas en esta zona. Pulsa
«Añadir mesa».». Cargando: «Cargando…». Error: un fallo al cargar no se avisa, el plano sale vacío
como si no hubiera zonas; un fallo al guardar sale dentro de la ventana abierta (o encima del plano
si no hay ninguna). El plano se recarga solo cuando cambia una mesa o una zona, no cuando se sienta o
se cobra una mesa (TABLES-F09).

### Zonas
Menú **Mesas → Zonas**. Tabla: Nombre (con su color), Mesas, Libres («libres / total»), Orden,
Estado (Activa, Inactiva); buscador «Buscar zona…», filtros, vista tabla o tarjetas. El «+» (solo a quien
puede crear zonas) abre el panel con Nombre, Color (Azul, Cian, Morado, Verde, Ámbar, Rojo, Gris), Orden y «Añadir zona»; por
fila «Editar» (el mismo panel con el interruptor «Activa» y «Guardar cambios») y «Borrar», que pide
confirmación en «¿Borrar la zona?» y deja el botón «Borrar zona» apagado si la zona tiene mesas.
Vacía: «No hay zonas. Pulsa «+» para crear la primera (Salón, Terraza, Barra…).». Error: el de la
tabla con reintento; el de guardar, dentro del panel.

### Mesas
Menú **Mesas → Mesas**. Tabla en orden natural (la 2 antes que la 10): Número, Nombre, Zona, Aforo,
Estado; buscador «Buscar mesa o zona…» (busca por número y nombre), filtros, vista tabla o
tarjetas. El «+» abre el panel con Número, Aforo, Zona y «Añadir mesa». No tiene acciones por fila:
editar y borrar se hace en el plano. Vacía: «Sin mesas.». Cargando: «Cargando…». Error: el de la
tabla con reintento; el de guardar, dentro del panel.

### Sesiones
Menú **Mesas → Sesiones**: las cuentas de la sala. Pestañas «Abiertas», «Cerradas» y «Todas».
Tabla: Mesa («Sin mesa (aparcada)» si no tiene), Cobrado y Cierre (no salen en Abiertas), Zona,
Camarero, Comensales, Apertura, Tiempo, Estado (Abierta, Cerrada, Trasladada, Fusionada, Aparcada);
el tiempo de una cuenta abierta se pone ámbar y rojo según los Ajustes. Buscador «Buscar mesa…»,
filtros por zona, camarero y estado. Por fila «Detalle» (ventana con zona, camarero, estado,
comensales, apertura, cierre, tiempo, cobrado y notas) y, en las abiertas, «Cerrar sesión», que pide
confirmación (TABLES-F21). Las horas van en la hora del negocio. Vacía: «No hay sesiones. Sienta a un
grupo desde el TPV y aparecerá aquí.». Error: el de la tabla con reintento; el de cerrar, encima de
la tabla. Se refresca sola cuando se abre, se cierra a mano o desde el TPV, se mueve o se corrige una
cuenta; no cuando la cierra un cobro o una anulación.

### Ajustes
Menú **Mesas → Ajustes** (la pestaña la pone el hub). Título «Mesas» y tres campos: «Preguntar los
comensales al sentar una mesa», «Aviso ámbar (minutos)» y «Aviso rojo (minutos)», y «Guardar». Solo la ve
quien tiene el permiso de cambiarlos (`tables.manage_settings`; de fábrica, solo el administrador):
a los demás el hub no les enseña la pestaña (HUB_SHELL-F43, hub#2588).

### Elegir mesa (en el TPV)
En **Ventas → Vender**, el botón de mesa de la cabecera de la cuenta («Asignar mesa»; se colorea
cuando la cuenta tiene mesa) abre la ventana «Elegir mesa»: pestañas por zona y una rejilla de mesas
con número, aforo, comensales sentados, estado escrito y, si la hay, la reserva («Ana · 21:00»;
«Cliente borrado · 21:00» si se borraron sus datos) en una línea: un nombre que no cabe se recorta
con «…» y la hora se ve siempre entera («Luis M… · 21:00»); el nombre completo va en el título de
la mesa. Una
mesa Bloqueada sale apagada. Cada mesa ocupada lleva un «⋮» («Opciones de mesa») con «Transferir»,
«Fusionar», «Dividir cuenta» y «Comensales». Al pie, «Quitar mesa» si la cuenta tiene mesa, o
«Cancelar» mientras se elige el destino de un traslado o una fusión («Elige una mesa libre», «Elige
una mesa ocupada»). Al sentar se abre la pregunta de comensales: «Comensales en la mesa N · 4 pax»,
botones «−» y «+», atajos del 1 al 8 que sientan de un toque, el aviso «Supera el aforo de la mesa
(4)» y «Atrás» / «Sentar N». Con Cocina instalada y productos sin enviar, sale «Envía primero los N
productos pendientes de la comanda actual.» con «Enviar comanda».
Vacía: «Sin mesas en esta zona.» y «Crea mesas en el módulo Mesas.». Cargando: «Cargando…». Error:
dentro de la ventana, en rojo; un fallo al cargar no se avisa y la rejilla sale vacía.

## Piezas compartidas entre flujos

| Pieza compartida | Flujos que la usan |
|---|---|
| Sentar gasta la retención de la mesa (cualquier reserva retenida en esa mesa) | TABLES-F10, TABLES-F15, TABLES-F17, TABLES-F24, TABLES-F28 |
| Liberar la mesa solo si no le queda ninguna cuenta abierta | TABLES-F13, TABLES-F15, TABLES-F16, TABLES-F18, TABLES-F21 |
| Cerrar las cuentas de un pedido por su pedido (solo al cobrarlo entero; anular un cobro no cierra nada) | TABLES-F18, TABLES-F19 |
| La ventana «Elegir mesa» y su bloqueo por productos sin enviar | TABLES-F10, TABLES-F11, TABLES-F12, TABLES-F13 |
| La cuenta de mesa del pedido que Ventas suelta (se cierra al cobrarlo entero o eliminarlo, se aparca al aparcarlo; nunca otra) | TABLES-F11, TABLES-F13, TABLES-F17, TABLES-F18 |
| Devolver al plano una mesa Reservada sin reserva viva ni gente | TABLES-F26, TABLES-F27, TABLES-F29, TABLES-F30 |

## Flujos

El detalle de cada flujo (pasos, datos, fallos, implicados y QA) vive en `workflow/`, con la misma
gramática y el mismo prefijo. Huecos (`parcial`, `no hecho`): el porqué está en la línea `Estado:`.

| ID | Flujo | Estado | Fichero |
|---|---|---|---|
| TABLES-F01 | Crear y ordenar las zonas del local | parcial | [workflow/plano.md](workflow/plano.md) |
| TABLES-F02 | Añadir mesas | parcial | [workflow/plano.md](workflow/plano.md) |
| TABLES-F03 | Colocar las mesas en el plano | parcial | [workflow/plano.md](workflow/plano.md) |
| TABLES-F04 | Editar o borrar una mesa | parcial | [workflow/plano.md](workflow/plano.md) |
| TABLES-F05 | Sacar una mesa del servicio (bloquearla) y devolverla | parcial | [workflow/plano.md](workflow/plano.md) |
| TABLES-F06 | Renombrar o borrar una zona | hecho | [workflow/plano.md](workflow/plano.md) |
| TABLES-F07 | Crear muchas mesas de golpe | parcial | [workflow/plano.md](workflow/plano.md) |
| TABLES-F08 | Ajustar la sala: comensales al sentar y avisos de tiempo | hecho | [workflow/plano.md](workflow/plano.md) |
| TABLES-F09 | Ver cómo está la sala | parcial | [workflow/servicio.md](workflow/servicio.md) |
| TABLES-F10 | Sentar a un grupo en una mesa libre o reservada | parcial | [workflow/servicio.md](workflow/servicio.md) |
| TABLES-F11 | Volver a una mesa ocupada y cambiar de mesa en el TPV | parcial | [workflow/servicio.md](workflow/servicio.md) |
| TABLES-F12 | Llevar a una mesa la cuenta que ya está en pantalla | hecho | [workflow/servicio.md](workflow/servicio.md) |
| TABLES-F13 | Quitar la mesa de una cuenta (aparcarla) | parcial | [workflow/servicio.md](workflow/servicio.md) |
| TABLES-F14 | Corregir los comensales de una mesa ocupada | hecho | [workflow/servicio.md](workflow/servicio.md) |
| TABLES-F15 | Pasar la cuenta a otra mesa (transferir) | parcial | [workflow/servicio.md](workflow/servicio.md) |
| TABLES-F16 | Juntar las cuentas de dos mesas ocupadas (fusionar) | parcial | [workflow/servicio.md](workflow/servicio.md) |
| TABLES-F17 | Dividir la cuenta de una mesa | parcial | [workflow/servicio.md](workflow/servicio.md) |
| TABLES-F18 | Liberar la mesa al cobrar la cuenta entera | hecho | [workflow/cierre-e-historial.md](workflow/cierre-e-historial.md) |
| TABLES-F19 | Anular un cobro de una mesa | hecho | [workflow/cierre-e-historial.md](workflow/cierre-e-historial.md) |
| TABLES-F20 | Eliminar en Ventas la cuenta abierta de una mesa | no hecho | [workflow/cierre-e-historial.md](workflow/cierre-e-historial.md) |
| TABLES-F21 | Cerrar una mesa a mano | parcial | [workflow/cierre-e-historial.md](workflow/cierre-e-historial.md) |
| TABLES-F22 | Consultar las cuentas de la sala (abiertas y cerradas) | hecho | [workflow/cierre-e-historial.md](workflow/cierre-e-historial.md) |
| TABLES-F23 | Borrar una cuenta cerrada del historial | hecho | [workflow/cierre-e-historial.md](workflow/cierre-e-historial.md) |
| TABLES-F24 | Volver a sentar una cuenta aparcada | parcial | [workflow/cierre-e-historial.md](workflow/cierre-e-historial.md) |
| TABLES-F25 | Retener la mesa de una reserva confirmada | parcial | [workflow/reservas.md](workflow/reservas.md) |
| TABLES-F26 | Mover o soltar la retención cuando cambia la reserva | parcial | [workflow/reservas.md](workflow/reservas.md) |
| TABLES-F27 | Soltar la mesa cuando la reserva se cancela, no se presenta o se borra | parcial | [workflow/reservas.md](workflow/reservas.md) |
| TABLES-F28 | Gastar la retención al sentar a la reserva | parcial | [workflow/reservas.md](workflow/reservas.md) |
| TABLES-F29 | Caducar las retenciones vencidas | parcial | [workflow/reservas.md](workflow/reservas.md) |
| TABLES-F30 | Retener o soltar una mesa a mano | parcial | [workflow/reservas.md](workflow/reservas.md) |
| TABLES-F31 | Olvidar el nombre de un cliente cuyos datos se borran (RGPD) | parcial | [workflow/reservas.md](workflow/reservas.md) |

## Cobertura contra la referencia

| Elemento de la referencia | Estado | Flujo |
|---|---|---|
| Zonas con nombre y orden | hecho (el color solo se ve en la lista de Zonas) | F01, F06 |
| Desactivar una zona la saca del servicio | no hecho: «Activa» no cambia nada en el plano ni en el TPV | F01 |
| Mesas con número, aforo y forma | parcial: forma rectangular sin dibujo propio; el número se puede repetir desde la lista Mesas | F02, F04 |
| Plano que se edita arrastrando, también con teclado | hecho (el tamaño de la mesa no se cambia en pantalla) | F03 |
| Estado escrito, no solo por color | hecho | F09 |
| Plano en vivo (cambia solo al sentar y cobrar) | no hecho: el plano solo se recarga al cambiar mesas o zonas | F09 |
| Bloquear una mesa (fuera de servicio) | parcial: cambiando «Estado» a mano, que también acepta Ocupada o Disponible sin cuenta | F05 |
| Pedir los comensales al sentar, con atajos | hecho | F10, F08 |
| Dos TPV a la vez sobre la misma mesa: gana uno | parcial: si ya está ocupada se rechaza; en el mismo instante pueden entrar las dos (sin ejecutar) | F10 |
| Superar el aforo avisa sin impedir | hecho | F10, F14 |
| Varias cuentas en una mesa (dividir) | parcial: solo en la misma mesa, sin deshacer; tocar la mesa abre una de las dos sin elegir | F17 |
| Transferir la cuenta a otra mesa | parcial: con la mesa dividida se traslada una de sus dos cuentas sin elegir cuál | F15 |
| Juntar las cuentas de dos mesas | parcial: las líneas las junta Ventas y su fallo no se ve | F16 |
| Juntar mesas físicas para un grupo grande (aforo sumado) | no hecho (duda abierta 3) | — |
| Mesa «por limpiar» tras irse el grupo | no hecho (duda abierta 2) | — |
| Planos distintos por turno (comida / cena) | fuera del MVP | — |
| Camarero de la cuenta visible | hecho (es quien la abre; no se cambia en pantalla) | F09, F22 |
| Tiempo en mesa con color ámbar y rojo | hecho en Sesiones; en el plano, sin color | F08, F22 |
| La mesa se libera sola al cobrar la cuenta entera | hecho (con la mesa dividida, solo cuando se cobra la última cuenta) | F18, F17 |
| Un cobro parcial no libera la mesa | hecho | F18 |
| Anular un cobro no rompe la mesa | hecho | F19 |
| Eliminar la cuenta libera la mesa | no hecho | F20 |
| Cuentas cerradas con su importe | hecho | F22 |
| Reserva confirmada visible en su mesa | parcial: se pinta desde que se confirma, no cerca de su hora; la mesa solo se pone a la reserva con el asistente | F25 |
| El estado de la mesa sigue a la reserva (mover, cancelar, no-show) | parcial: la hora y el borrado no se siguen | F26, F27 |
| Sentar a la reserva gasta su mesa | parcial: lo gasta abrir la mesa en el TPV, y lo gasta cualquiera que se siente | F28 |
| Una reserva que no llega no deja la mesa muerta | parcial: caduca 1 o 2 horas tarde (sin ejecutar) | F29 |
| Retener una mesa a mano | parcial: solo con el asistente | F30 |

## Datos: de quién es cada dato

- **Propios**: zonas, mesas (número, nombre, aforo, forma, sitio en el plano, estado, si está en uso),
  las cuentas de mesa (comensales, quién atiende, apertura y cierre, notas, de qué cuenta salió), el
  recorrido de cada cuenta por las mesas (de qué mesa a qué mesa y por qué; se guarda y ninguna
  pantalla lo enseña), las retenciones por reserva, el libro de lo cobrado en cada cuenta y los
  ajustes de sala (uno por hub). Otros módulos los leen por sus consultas públicas.
- **De Ventas**: qué cuenta (pedido) está en qué mesa se guarda como una referencia que Mesas no
  abre; lo cobrado llega por los avisos de venta cobrada y venta anulada (con su importe en céntimos)
  y Mesas lo apunta en su propio libro; el aviso de pedido completado (cuenta cobrada entera) cierra
  la cuenta de mesa. Nunca lee las tablas de Ventas.
- **De Reservas**: la reserva llega por sus avisos de cambio de estado y de cambio de datos: mesa,
  fecha, hora, duración, comensales, nombre y ficha de cliente. Mesas guarda solo la referencia de
  la reserva, su ventana, sus comensales, el nombre que pinta y de qué ficha es.
- **De Clientes**: el aviso de borrado de los datos de una ficha (TABLES-F31). Nunca lee sus tablas.
- **Del hub**: quién atiende es la persona del hub que abrió la cuenta; el nombre se busca en la lista
  de personas del hub cada vez que se pinta, no se copia.
- **Datos personales** (inventario RGPD, de las migraciones):
  - retención de mesa: el nombre del cliente copiado de la reserva, el enlace a su ficha y sus
    comensales; el nombre se guarda solo mientras la retención está viva;
  - cuenta de mesa: quién la atiende y las notas libres (pueden traer cualquier dato de la mesa);
  - mesa y zona: nombre y descripción libres;
  - en las siete tablas (zonas, mesas, cuentas, recorrido, retenciones, libro de cobrado, ajustes):
    qué persona del hub creó y cambió cada fila;
  - copias fuera de Mesas: cada aviso que emite Mesas lleva lo que se mandó en la orden más la
    persona del hub que la dio y la identidad fiscal del negocio (NIF, razón social y dirección, que en
    un autónomo son datos personales); así, el de cuenta abierta o dividida lleva las notas si se
    mandaron, y el de mesa retenida a mano, el nombre de la retención.
  - **Borrado**: al borrar los datos personales de una ficha en Clientes, Mesas vacía el nombre de
    todas sus retenciones, también las terminadas y las borradas (F31); la mesa sigue Reservada y la
    pantalla dice «Cliente borrado». Se conservan la mesa, la hora, los comensales, el estado, la
    referencia de la reserva y el enlace a la ficha. No alcanza las retenciones sin ficha ni las
    vivas anteriores a esta versión (las dos olvidan el nombre al terminar), ni las notas libres de
    una cuenta, ni los avisos ya emitidos, ni quién del equipo creó o cambió cada fila.

## Reglas que no se rompen

- **Aislamiento**: toda lectura y escritura va con el hub; una mesa, una cuenta o una reserva de otro
  hub nunca casa, tampoco al recibir los avisos de Ventas y Reservas. Excepción: volver a sentar una
  cuenta aparcada no comprueba de quién es la mesa (TABLES-F24), aunque no toca la mesa ajena.
- **Sentar solo donde se puede**: una cuenta nueva (abrir, transferir) solo entra en una mesa en uso,
  no borrada y Disponible o Reservada; si un TPV pide una mesa que otro ya ocupó, se rechaza. Dos
  peticiones en el mismo instante no las separa el servidor (TABLES-F10). Dividir acepta además una mesa Ocupada. Volver a sentar una cuenta aparcada no pasa
  por esta comprobación (TABLES-F24).
- **Fusionar** exige que la mesa destino sea otra y tenga una cuenta abierta.
- **Borrados con guarda**: una mesa con cuenta abierta no se borra; una zona con mesas en uso no se
  borra; una cuenta abierta no se borra del historial. Todo borrado es lógico: la historia queda.
- **Comensales**: siempre al menos 1.
- **Avisos de otros módulos repetidos**: un cobro, una anulación o una confirmación de reserva que
  llega dos veces cuenta una sola vez.
- **Permisos**: dibujar el plano (zonas y mesas) es del responsable y del administrador; borrar mesas,
  zonas y cuentas del historial y cambiar los ajustes, solo del administrador. Sentar, cerrar,
  transferir, fusionar, dividir, aparcar y corregir comensales lo pueden hacer el empleado, el cajero
  y el responsable. Un empleado o un cajero que intenta dibujar el plano recibe la petición del PIN de
  un responsable; lo que es solo del administrador se rechaza. El hub lo aplica aunque la pantalla
  enseñe el botón.
- **Dinero y fiscal**: Mesas no cobra, no factura y no cambia importes; lo «Cobrado» solo copia lo que
  Ventas anuncia, en céntimos.

## Lo que NO hace, a propósito

- No sabe qué se ha pedido: líneas, importes y cocina son de Ventas y Cocina.
- No impide sentar más comensales que el aforo: avisa.
- No toma reservas ni asigna mesa a una reserva: eso es Reservas; Mesas solo la retiene en el plano.
- No tiene asiento por comensal ni cursos.
- No guarda planos distintos por turno.
- No avisa al cliente de nada.

## Dudas abiertas

Se resuelven con `market-decision`; no las decide el worker.

1. ¿Desde cuándo se pinta Reservada una mesa: desde que se confirma (hoy, aunque sea para dentro de
   una semana) o desde un rato antes de su hora, como OpenTable? Y sentar a alguien en esa mesa horas
   antes, ¿debe gastar la reserva de la noche (hoy sí)?
2. ¿Entra en el MVP el estado «por limpiar» que deja la mesa al irse el grupo?
3. ¿Entra en el MVP juntar mesas físicas para un grupo grande (aforo sumado) y separarlas después?
4. ¿Se puede cerrar a mano una mesa cuya cuenta sigue abierta en Ventas (hoy sí, y la cuenta pierde
   su mesa)?
5. ¿Hace falta en pantalla volver a sentar una cuenta aparcada, deshacer una división y elegir cuál
   de las cuentas de una mesa dividida se abre?
6. ¿El número de mesa debe ser único en su zona también para el asistente y la lista Mesas (hoy solo
   lo comprueba el plano)?
7. ¿Desactivar una zona o una mesa debe sacarla del TPV?
8. ¿El camarero de una cuenta se puede elegir y cambiar (hoy es siempre quien la abre)?

## Fuentes contrastadas

Contra `origin/main` v2.2.57 (05/10/2026). Una línea por discrepancia; manda el código.

- **`architecture/modules/tables.md`** (tabla de permisos y de comandos): transferir y fusionar piden `tables.change_tablesession`; piden `tables.transfer_tablesession` (tables#66). La tabla de permisos no lista el perfil cajero, que tiene los mismos permisos de sala que el empleado (F15, F16).
- **`architecture/modules/tables.md`** y `docs/concepts.md`: «la reserva confirmada pinta la mesa reservada» durante su ventana; se pinta desde el momento de confirmar, sea cual sea la fecha (F25).
- **`architecture/modules/tables.md`**, `docs/concepts.md`, `docs/limits.md`: la retención vence «en el siguiente repaso de 15 minutos» tras su ventana; el repaso compara la hora de la reserva (del negocio, sin zona) con la hora del servidor en UTC, así que en la península caduca 2 horas tarde en verano y 1 en invierno, más hasta 15 minutos del repaso (leído en el código, sin ejecutar) (F29).
- **`architecture/modules/tables.md`** («Quién atiende la cuenta»): el camarero «viaja también en el aviso de cuenta abierta»; el aviso lleva lo que mandó el TPV (mesa y comensales) y quién dio la orden, no el camarero que resuelve Mesas (F10).
- **`architecture/modules/tables.md`** («Dónde vive cada guarda»): la comprobación en la base de datos es «la red de la carrera de dos TPV»; la escritura no bloquea la mesa y la comprobación posterior pasa en las dos aperturas, así que dos peticiones simultáneas pueden entrar (leído en el código, sin ejecutar) (F10).
- **`module.json`** (`tables.sessions.by_order`, descripción para el asistente): «la usa Cocina»; Cocina no la llama (F18).
- **`module.json`** (`tables.sessions.close`, descripción para el asistente): «tras el pago»; cerrar no comprueba nada de Ventas (F21).
- **`docs/limits.md`**: los rechazos se llaman `not_available`, `tables_attached`, `active_sessions`, `invalid_capacity`, `invalid_status`; hoy son `tables.table_not_available`, `tables.zone_has_tables`, `tables.table_has_active_session`, y aforo y estado los rechaza el esquema (F04, F06, F10).
- **`docs/limits.md`**: «borrar una zona borra sus mesas»; una zona con mesas en uso no se borra, y las que no estaban en uso se quedan sin zona visible (F06).
- **`docs/limits.md`** y `docs/concepts.md`: «si las dos mesas tenían pedido, termina la unión en el TPV»; el TPV junta las líneas solo (F16).
- **`docs/screens.md`**: Zonas «ordenada por nombre» (va por Orden); «crear mesa» en Mesas con nombre y forma (el panel solo pide Número, Aforo y Zona); dividir «en la misma mesa o en otra» (la pantalla solo en la misma) (F01, F02, F17).
- **`docs/screens.md`** y `docs/limits.md`: el empleado «restaura, retiene y suelta» mesas; no hay pantalla para nada de eso (F24, F30).
- **`docs/overview.md`**: la tabla de avisos que escucha omite los dos avisos de Reservas (F25).
- **Manual (`hand-book/modulos/tables.md`)**: la pestaña se llama «Plano» (es «Plano de sala»); se sienta «en el plano o en el TPV» (solo en el TPV); al sentar se indican «camarero y nota» (solo comensales); se crean mesas «en bloque», se «restaura» una cuenta y se suelta «manualmente» una retención (ninguna con pantalla); el botón es «Unir» (es «Fusionar») y hay que «completar la unión en el TPV» (es automática) (F07, F10, F16, F24, F30).
- **Texto de ayuda del buscador de Mesas** («Buscar mesa o zona…»): no encuentra por zona, busca por número y nombre (pantalla Mesas).
- **Texto del ajuste** «Desactivado: sentar una mesa libre abre la cuenta con el aforo de la mesa»: en una mesa reservada la abre con los comensales de la reserva (F08).
- **Mensajes de «Transferir», «Fusionar», «Dividir cuenta» y «Comensales» en el TPV**: enseñan el texto del hub sin traducir: el de la orden rechazada sale en inglés, y el de una comprobación interna, con su nombre técnico (leído en el código, sin ejecutar; no comprobado si el shell lo traduce antes) (F14, F15, F16, F17).
- **QA R-02 y `qa-hub-restaurant` §05**: «modificar fecha u hora libera la retención anterior»; cambiar la hora no la mueve (F26).
- **`qa-hub-restaurant` §06**: «asignar y cambiar camarero» y «restaurar cuenta»; no hay pantalla para ninguno (F10, F24).
- **`qa-hub-restaurant` §09**: «revertir el split y volver a fusionar antes de pagar»; una división no se deshace y dos cuentas de la misma mesa no se pueden fusionar (F17).
- **`qa-hub-restaurant` §04**: «unir/separar físicamente mesas» y «estado por limpiar»; no existen (dudas 2 y 3).
- **`reservations` RESERVATIONS-F07, F11 y F20** decían que Mesas pinta la mesa reservada «desde su hora» y que la retención caduca «al acabar su ventana»; corregidos en la oleada 2 para que cuenten lo de F25, F28 y F29.
