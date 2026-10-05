# WORKFLOW — Mesas · Cerrar mesas e historial de cuentas

Prefijo: TABLES

## Flujos

### TABLES-F18 Liberar la mesa al cobrar la cuenta entera
Estado: parcial — con la mesa dividida, cobrar entera desde el TPV la cuenta nueva cierra también la cuenta de mesa que el TPV recordaba y libera esa mesa con la otra cuenta todavía abierta en Ventas (TABLES-F17, leído en el código, sin ejecutar)
Actor: sistema
Pantalla: Ventas: Cobro
Pasos:
1. En Ventas se cobra la cuenta de una mesa.
2. Mesas apunta lo cobrado en esa cuenta de mesa (sale en «Cobrado» de **Sesiones**), también en cada cobro parcial.
3. Si se cobró la cuenta entera, Mesas cierra su cuenta de mesa y deja la mesa Disponible si no le queda otra cuenta abierta. El TPV que cobra también pide cerrar la cuenta de mesa que recordaba como «de delante»; en una mesa sin dividir es la misma, pero tras dividir puede ser otra (la original o la de otra mesa) y entonces se cierra también, y su mesa se libera con su cuenta abierta en Ventas (TABLES-F17).
4. Con un cobro parcial la cuenta sigue abierta y la mesa, Ocupada.
Entra: de Ventas, cada venta cobrada (su pedido y su importe en céntimos) y el fin de la cuenta cuando se cobra entera.
Sale: lo cobrado apuntado una sola vez por venta; la cuenta de mesa «Cerrada» con su hora; la mesa Disponible. El cierre que llega por el cobro no avisa a nadie; solo avisa (tables.session.closed) si lo hace antes el TPV que tenía la mesa delante (el orden entre los dos no está garantizado). Una venta sin mesa (barra, para llevar) no deja nada.
Si falla: Mesas lo recibe por los avisos de Ventas, que se reintentan; nada se ve en pantalla. Una cuenta aparcada que se cobra se queda «Aparcada» (TABLES-F13); una mesa Bloqueada a mano sigue Bloqueada.
Implicados: FLOWS-F13, SALES-F01, SALES-F22, REC_RESTAURANTE-F11, REC_RESTAURANTE-F13
QA: R-09, R-10, qa-hub-restaurant §09

### TABLES-F19 Anular un cobro de una mesa
Estado: parcial — anular un cobro parcial cierra la cuenta de mesa y libera la mesa aunque la cuenta siga abierta en Ventas, que se queda sin mesa
Actor: sistema
Pantalla: Ventas: Ventas
Pasos:
1. En Ventas, un responsable anula una venta cobrada que era de una mesa.
2. Mesas deja de contarla en «Cobrado».
3. Si la cuenta de mesa de ese pedido seguía abierta (era un cobro parcial), Mesas la cierra y deja la mesa Disponible si no le queda otra cuenta, aunque en Ventas la cuenta siga abierta con lo que falta por cobrar.
Entra: de Ventas, la venta anulada con su pedido.
Sale: el cobro marcado como anulado; la cuenta de mesa cerrada y la mesa libre. No avisa a nadie.
Si falla: como TABLES-F18. La cuenta que sigue abierta en Ventas se retoma desde **Cuentas abiertas**, sin mesa.
Implicados: SALES-F30, REC_RESTAURANTE-F15
QA: R-11, qa-hub-restaurant §13

### TABLES-F20 Eliminar en Ventas la cuenta abierta de una mesa
Estado: no hecho — Mesas no se entera: la mesa se queda Ocupada con una cuenta anulada hasta cerrarla a mano en Sesiones
Actor: responsable, empleado, cajero
Pantalla: Ventas: Cuentas abiertas
Pasos:
1. En **Ventas → Cuentas abiertas** se elimina la cuenta de una mesa (con el PIN de un responsable si hace falta).
2. La cuenta queda anulada en Ventas, pero la mesa sigue Ocupada en el plano y en «Elegir mesa», con su cuenta de mesa abierta.
3. Para liberarla, en **Mesas → Sesiones**, «Cerrar sesión» en esa cuenta (TABLES-F21).
Entra: nada: Mesas no escucha la eliminación de una cuenta.
Sale: nada.
Si falla: no aplica.
Implicados: SALES-F18, REC_RESTAURANTE-F14
QA: qa-hub-restaurant §13

### TABLES-F21 Cerrar una mesa a mano
Estado: parcial — cierra aunque la cuenta siga abierta en Ventas, que se queda sin mesa
Actor: empleado, cajero, responsable
Pantalla: Sesiones
Pasos:
1. En **Mesas → Sesiones → Abiertas**, pulsa «Cerrar sesión» en la cuenta (o en su «Detalle»).
2. Confirma en «¿Cerrar la sesión?»: «Mesa N · N comensales. La mesa queda libre y la sesión pasa al histórico. Para cobrar la cuenta, usa el TPV.».
3. La cuenta pasa a Cerradas y la mesa queda Disponible si no le queda otra cuenta abierta.
Entra: la cuenta de mesa abierta.
Sale: la cuenta de mesa «Cerrada» con su hora (avisa: tables.session.closed). En Ventas la cuenta, si la había, sigue abierta en **Cuentas abiertas** y ya no se reconoce como de esa mesa.
Si falla: encima de la tabla, el motivo traducido o «No se pudo cerrar la sesión» (p. ej. ya la cerró otro).
Implicados: FLOWS-F13, SALES-F19, REC_RESTAURANTE-F13
QA: R-10

### TABLES-F22 Consultar las cuentas de la sala (abiertas y cerradas)
Estado: hecho
Actor: responsable, empleado, cajero
Pantalla: Sesiones
Pasos:
1. Abre **Mesas → Sesiones**: arranca en «Abiertas», las más recientes primero.
2. «Cerradas» enseña las cobradas o cerradas con «Cobrado» y «Cierre»; «Todas», también las trasladadas, fusionadas y aparcadas.
3. Filtra por zona, camarero o estado, o busca por número de mesa. El tiempo de una abierta se pone ámbar y rojo según los Ajustes.
4. Toca una fila (o «Detalle») para ver zona, camarero, estado, comensales, apertura, cierre, tiempo, cobrado y notas.
Entra: las cuentas de mesa, lo cobrado apuntado (TABLES-F18) y los nombres de las personas del hub.
Sale: nada.
Si falla: el error de la tabla con reintento. Una cuenta cerrada antes de que existiera el libro de cobrado sale con «—»; las devoluciones no restan del «Cobrado». El recorrido de una cuenta por varias mesas se guarda pero no se ve.
Implicados: REC_RESTAURANTE-F16
QA: R-10

### TABLES-F23 Borrar una cuenta cerrada del historial
Estado: hecho
Actor: administrador, asistente
Pantalla: asistente
Pasos:
1. Pide al asistente borrar una cuenta de mesa ya cerrada (no hay botón).
2. Desaparece de **Sesiones**; queda guardada como borrada y su recorrido por las mesas se conserva.
Entra: la cuenta de mesa.
Sale: la cuenta borrada (avisa: tables.session.deleted).
Si falla: una cuenta abierta no se borra (hay que cerrarla antes); solo el administrador puede borrar.
Implicados: ninguno
QA: ninguno

### TABLES-F24 Volver a sentar una cuenta aparcada
Estado: parcial — sin pantalla (solo con el asistente), y no comprueba que la mesa elegida esté libre (una Ocupada o Bloqueada la acepta), ni que sea de este negocio ni que siga en uso: la cuenta puede quedar apuntando a una mesa borrada o ajena
Actor: empleado, cajero, responsable, asistente
Pantalla: asistente
Pasos:
1. Pide al asistente sentar una cuenta aparcada en una mesa.
2. La cuenta de mesa vuelve a «Abierta» en esa mesa, con sus comensales, su camarero y su hora de apertura; la mesa pasa a Ocupada y, si estaba Reservada, gasta la reserva.
Entra: la cuenta aparcada y la mesa.
Sale: la cuenta de mesa sentada (avisa: tables.session.restored).
Si falla: «Esa cuenta no está aparcada: no existe en este negocio, o ya está sentada en una mesa.».
Implicados: ninguno
QA: qa-hub-restaurant §06 (discrepa)
