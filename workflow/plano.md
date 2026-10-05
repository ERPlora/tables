# WORKFLOW — Mesas · Dibujar el plano

Prefijo: TABLES

## Flujos

### TABLES-F01 Crear y ordenar las zonas del local
Estado: parcial — el interruptor «Activa» no saca la zona del plano ni del TPV; el color de la zona solo se ve en la lista de Zonas
Actor: responsable, administrador
Pantalla: Zonas
Pasos:
1. En **Mesas → Zonas** pulsa «+».
2. Escribe el Nombre (Salón, Terraza, Barra…), elige el Color y el Orden (viene puesto el siguiente).
3. Pulsa «Añadir zona».
4. La zona sale en la lista con 0 mesas y, en ese orden, como pestaña del **Plano de sala** y de la ventana «Elegir mesa» del TPV. También se crea desde el «+» del plano (campo Zona y «Añadir zona»): entonces se pone la última y queda elegida.
Entra: el nombre que da el responsable.
Sale: la zona (avisa: tables.zone.created).
Si falla: sin nombre, el botón no se activa. Un empleado o un cajero no ve el «+» de Zonas; desde el plano, recibe la petición del PIN de un responsable. Otro fallo sale dentro del panel («No se pudo guardar la zona» o «No se pudo crear la zona»).
Implicados: REC_RESTAURANTE-F02
QA: R-01, qa-hub-restaurant §04

### TABLES-F02 Añadir mesas
Estado: parcial — desde la lista Mesas se puede repetir un número y crear una mesa «Sin zona» que, habiendo zonas, no sale ni en el plano ni en el TPV
Actor: responsable, administrador
Pantalla: Plano de sala
Pasos:
1. En **Mesas → Plano de sala**, elige la zona y pulsa «+».
2. En «Número de mesa» escribe el número o nombre (S1, Terraza A) o déjalo vacío: «Se numera sola» con el primer número libre de esa zona.
3. Pulsa «Añadir mesa» (apagado mientras no haya ninguna zona).
4. La mesa aparece en la zona, en el primer hueco libre, cuadrada, para 4 y Disponible; su aforo y su forma se cambian después (TABLES-F04).
5. Otra puerta: en **Mesas → Mesas**, «+» con Número, Aforo y Zona («Sin zona» por defecto) y «Añadir mesa». Esta no comprueba si el número ya existe.
Entra: número, y en la lista también aforo y zona.
Sale: la mesa en uso (avisa: tables.table.created). Con una mesa en uso, el paso «Tus mesas» de la puesta en marcha queda hecho.
Si falla: en el plano, número repetido en la zona (sin distinguir mayúsculas ni espacios): «Ya hay una mesa con ese número en esta zona». Zona borrada mientras tanto: «Esa zona no está disponible: no existe en este negocio o se ha eliminado.». Un empleado o un cajero recibe la petición del PIN de un responsable. Otro fallo: «No se pudo crear la mesa», dentro de la ventana o del panel.
Implicados: REC_RESTAURANTE-F02, HUB-F35, HUB_SHELL-F31
QA: R-01, qa-hub-restaurant §04

### TABLES-F03 Colocar las mesas en el plano
Estado: parcial — el tamaño de la mesa no se cambia en pantalla y la forma rectangular se dibuja cuadrada
Actor: responsable, administrador
Pantalla: Plano de sala
Pasos:
1. En **Plano de sala**, elige la zona.
2. Arrastra cada mesa a su sitio (el gesto lo coge solo la mesa; deslizar sobre el plano vacío mueve la página). Con teclado: tabula hasta la mesa y muévela con las flechas (8 px; con Mayúsculas, 32 px).
3. Al soltar se guarda al momento; no hay botón de guardar. La mesa no sale del borde del plano.
4. Al recargar, cada mesa sigue donde se dejó. Las mesas que nadie ha colocado nunca (las que llegan de una plantilla o de versiones viejas) se reparten solas en rejilla, por zona, sin taparse.
Entra: la posición nueva.
Sale: la posición de la mesa (avisa: tables.table.updated).
Si falla: «No se pudo guardar la posición» encima del plano; la mesa se queda donde se soltó en pantalla, pero al recargar vuelve a la última posición guardada. Un empleado o un cajero recibe la petición del PIN de un responsable.
Implicados: REC_RESTAURANTE-F02
QA: qa-hub-restaurant §04

### TABLES-F04 Editar o borrar una mesa
Estado: parcial — «Borrar» no pide confirmación; el campo «Estado» deja poner Ocupada o Disponible a mano sin abrir ni cerrar ninguna cuenta (una mesa con cuenta puesta Disponible admite una segunda cuenta encima); poner Reservada a mano no dura: el repaso de cada 15 minutos la devuelve a Disponible si no tiene reserva retenida ni cuenta
Actor: responsable, administrador
Pantalla: Plano de sala
Pasos:
1. En **Plano de sala**, toca la mesa: se abre «Editar mesa».
2. Cambia Número, Aforo, Nombre (opcional), Forma (Cuadrada, Redonda, Rectangular), Estado o Zona.
3. Pulsa «Guardar»: la ventana se cierra y el plano se recarga (si cambió de zona, aparece en la otra pestaña en el mismo sitio).
4. Para quitarla, pulsa «Borrar» (solo el administrador): desaparece del plano, de la lista y del TPV; su historia de cuentas se conserva.
Entra: la mesa elegida.
Sale: la mesa cambiada (avisa: tables.table.updated) o borrada (avisa: tables.table.deleted).
Si falla: dentro de la ventana: «El número de mesa es obligatorio», «Ya hay una mesa con ese número en esta zona», «Esa mesa no existe en este negocio.»; borrar una mesa con cuenta abierta: «Esa mesa tiene una cuenta abierta. Ciérrala o trasládala antes de borrar la mesa.». Un responsable no puede borrar (lo rechaza el hub); un empleado o un cajero que guarda cambios recibe la petición del PIN de un responsable.
Implicados: REC_RESTAURANTE-F02
QA: qa-hub-restaurant §04

### TABLES-F05 Sacar una mesa del servicio (bloquearla) y devolverla
Estado: parcial — no hay acción propia: se hace con el campo «Estado» de «Editar mesa», el mismo que acepta cualquier estado
Actor: responsable, administrador
Pantalla: Plano de sala
Pasos:
1. En **Plano de sala**, toca la mesa y en «Estado» elige «Bloqueada»; pulsa «Guardar».
2. La mesa sale Bloqueada (gris) en el plano y apagada en «Elegir mesa» del TPV, con el motivo «Mesa fuera de servicio: no se puede sentar hasta que se desbloquee.».
3. Para devolverla, pon «Disponible» y guarda.
4. Bloquear una mesa ocupada no toca su cuenta; al cobrarla, la mesa sigue Bloqueada. Una reserva confirmada no pinta Reservada una mesa Bloqueada. Las demás opciones del mismo campo tienen los efectos de TABLES-F04 (Reservada a mano se deshace sola en el siguiente repaso de 15 minutos).
Entra: la mesa elegida.
Sale: el estado de la mesa (avisa: tables.table.updated).
Si falla: como en TABLES-F04. Si alguien intenta sentar en ella (teclado, o la bloquearon con la ventana abierta), sale el mismo motivo y el plano se relee.
Implicados: REC_RESTAURANTE-F02
QA: qa-hub-restaurant §04

### TABLES-F06 Renombrar o borrar una zona
Estado: hecho
Actor: responsable, administrador
Pantalla: Zonas
Pasos:
1. En **Mesas → Zonas**, toca la zona o «Editar»: cambia Nombre, Color, Orden o «Activa» y pulsa «Guardar cambios». En el **Plano de sala**, el lápiz («Editar zona») cambia Nombre y Descripción (opcional).
2. Para borrarla (solo el administrador): «Borrar» en su fila abre «¿Borrar la zona?» con «N mesas en esta zona. Una zona con mesas no se puede borrar: mueve o borra antes sus mesas.» (la frase sale siempre, también con 0 mesas); si N es mayor que 0, «Borrar zona» sale apagado.
3. Sin mesas en uso, «Borrar zona» la quita de la lista, del plano y del TPV. En el plano, «Borrar zona» del lápiz no pide confirmación.
Entra: la zona elegida.
Sale: la zona cambiada (avisa: tables.zone.updated) o borrada (avisa: tables.zone.deleted).
Si falla: «Esta zona todavía tiene mesas. Muévelas a otra zona o bórralas antes.» o «Esa zona no existe en este negocio.»; un responsable no puede borrar. Las mesas desactivadas de una zona borrada se quedan sin zona visible.
Implicados: ninguno
QA: qa-hub-restaurant §04

### TABLES-F07 Crear muchas mesas de golpe
Estado: parcial — sin pantalla: solo con el asistente
Actor: responsable, asistente
Pantalla: asistente
Pasos:
1. Pide al asistente «crea 12 mesas en la Terraza, de la T1 a la T12, para 4».
2. Se crean de una vez (de 1 a 100), numeradas con el prefijo y el número inicial que se digan (1 si no), con el aforo (4) y la forma (cuadrada) que se digan, y repartidas de cinco en cinco en el plano de su zona.
3. Aparecen en el **Plano de sala** y en **Mesas**.
Entra: zona, cuántas, prefijo, número inicial, aforo y forma.
Sale: las mesas (avisa: tables.table.created).
Si falla: si la zona no existe, no se crea ninguna. No comprueba números repetidos.
Implicados: ninguno
QA: ninguno

### TABLES-F08 Ajustar la sala: comensales al sentar y avisos de tiempo
Estado: hecho
Actor: administrador
Pantalla: Ajustes
Pasos:
1. En **Mesas → Ajustes**, marca o desmarca «Preguntar los comensales al sentar una mesa».
2. Pon «Aviso ámbar (minutos)» y «Aviso rojo (minutos)» (de 1 a 600).
3. Pulsa «Guardar».
4. Desmarcado, en «Elegir mesa» del TPV tocar una mesa libre la abre de un toque con su aforo (con los comensales de la reserva si estaba Reservada). En **Sesiones**, el tiempo de una cuenta abierta se pone ámbar y rojo a partir de esos minutos. Sin guardar nunca: se pregunta, 60 y 90 minutos.
Entra: los tres valores.
Sale: los ajustes de sala del hub (avisa: tables.settings.updated); Sesiones los relee al momento y el TPV al abrir la ventana.
Si falla: un valor fuera de rango no se guarda; quien no es administrador ve «Solo un administrador puede cambiar estos ajustes.». No se comprueba que el rojo sea mayor que el ámbar.
Implicados: REC_RESTAURANTE-F02
QA: ninguno
