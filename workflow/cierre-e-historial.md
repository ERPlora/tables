# WORKFLOW — Mesas · Cerrar mesas e historial de cuentas

Prefijo: TABLES

## Flujos

### TABLES-F18 Liberar la mesa al cobrar la cuenta entera
Estado: hecho
Actor: sistema
Pantalla: Ventas: Cobro
Pasos:
1. En Ventas se cobra la cuenta de una mesa.
2. Mesas apunta lo cobrado en esa cuenta de mesa (sale en «Cobrado» de **Sesiones**), también en cada cobro parcial.
3. Si se cobró la cuenta entera, Mesas cierra su cuenta de mesa y deja la mesa Disponible si no le queda otra cuenta abierta. El TPV que cobra pide también cerrar la cuenta de mesa de ese mismo pedido, nunca otra: en una mesa dividida la otra cuenta sigue sentada y la mesa, Ocupada (TABLES-F17).
4. Con un cobro parcial la cuenta sigue abierta y la mesa, Ocupada.
Entra: de Ventas, cada venta cobrada (su pedido y su importe en céntimos) y el fin de la cuenta cuando se cobra entera.
Sale: lo cobrado apuntado una sola vez por venta; la cuenta de mesa «Cerrada» con su hora; la mesa Disponible. El cierre que llega por el cobro no avisa a nadie; solo avisa (tables.session.closed) si lo hace antes el TPV que tenía la mesa delante (el orden entre los dos no está garantizado). Una venta sin mesa (barra, para llevar) no deja nada.
Si falla: Mesas lo recibe por los avisos de Ventas, que se reintentan; nada se ve en pantalla. Una cuenta aparcada que se cobra se queda «Aparcada» (TABLES-F13); una mesa Bloqueada a mano sigue Bloqueada.
Implicados: FLOWS-F13, SALES-F01, SALES-F22, REC_RESTAURANTE-F10, REC_RESTAURANTE-F11, REC_RESTAURANTE-F13
QA: R-09, R-10, qa-hub-restaurant §09

### TABLES-F19 Anular un cobro de una mesa
Estado: hecho
Actor: sistema
Pantalla: Ventas: Ventas
Pasos:
1. En Ventas, un responsable anula una venta cobrada que era de una mesa.
2. Mesas deja de contarla en «Cobrado».
3. La cuenta de mesa y la mesa no cambian: anular una venta no termina la cuenta en Ventas. Si era un cobro parcial, la cuenta sigue abierta en su mesa, la mesa sigue Ocupada y la cuenta se retoma tocando la mesa en «Elegir mesa»; se cierra cuando se cobra entera (TABLES-F18). Si la cuenta ya se había cobrado entera, ya estaba cerrada y sigue cerrada, y la mesa no se toca aunque ya haya otro grupo sentado.
Entra: de Ventas, la venta anulada con su pedido.
Sale: el cobro marcado como anulado («Cobrado» baja, o sale «—» si no queda ningún cobro vivo). No avisa a nadie.
Si falla: como TABLES-F18.
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
Estado: hecho
Actor: empleado, cajero, responsable
Pantalla: Sesiones
Pasos:
1. En **Mesas → Sesiones → Abiertas**, pulsa «Cerrar sesión» en la cuenta (o en su «Detalle»).
2. Confirma en «¿Cerrar la sesión?»: «Mesa N · N comensales. La mesa queda libre y la sesión pasa al histórico. Si su cuenta sigue abierta en Ventas, primero cóbrala, pásala a otra mesa o elimínala desde el TPV.».
3. Si la mesa no tiene cuenta en Ventas, o su cuenta ya está cobrada o eliminada (TABLES-F20), la cuenta de mesa pasa a Cerradas y la mesa queda Disponible si no le queda otra cuenta abierta.
4. Si su cuenta sigue abierta en Ventas, no se cierra nada: la mesa sigue Ocupada con su cuenta, como en Toast, Square, Lightspeed u Odoo. Se cobra (TABLES-F18), se pasa a otra mesa (TABLES-F15) o se elimina en Ventas (TABLES-F20), y entonces sí se cierra.
Entra: la cuenta de mesa abierta y, si la tiene, el estado de su cuenta en Ventas. Sin Ventas instalado no hay cuenta que mirar y se cierra.
Sale: la cuenta de mesa «Cerrada» con su hora (avisa: tables.session.closed). Una cuenta de Ventas abierta nunca se queda sin su mesa.
Si falla: encima de la tabla, el motivo traducido: «La cuenta de esta mesa sigue abierta en Ventas: cóbrala, pásala a otra mesa o elimínala desde el TPV.», «La cuenta de esta mesa ha cambiado. Recarga la lista e inténtalo de nuevo.» (otro TPV le cambió la cuenta mientras tanto), «Esa cuenta no está abierta…» (ya la cerró otro) o «No se pudo cerrar la sesión».
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
