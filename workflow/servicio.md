# WORKFLOW — Mesas · La sala en el TPV

Prefijo: TABLES

Estos flujos pasan en **Ventas → Vender**, dentro de la ventana «Elegir mesa» que pone Mesas. Ventas
pone la cuenta, las líneas y los importes; Mesas pone la mesa y sabe qué cuenta hay en cada una.

## Flujos

### TABLES-F09 Ver cómo está la sala
Estado: parcial — el plano no se actualiza solo cuando se sienta, se traslada o se cobra una mesa (hay que salir y volver); las mesas desactivadas y las zonas inactivas siguen saliendo en el plano y en el TPV
Actor: responsable, empleado, cajero
Pantalla: Plano de sala
Pasos:
1. Abre **Mesas → Plano de sala** y elige la zona.
2. Cada mesa dice su estado escrito, con icono y color: Disponible, Ocupada, Reservada o Bloqueada.
3. Una mesa ocupada dice los comensales y los minutos que llevan («3 pax · 35 min») y quién la atiende; los minutos avanzan solos cada 30 segundos. Una mesa con reserva retenida dice el nombre y la hora de la reserva.
4. En «Elegir mesa» del TPV (se lee al abrir la ventana), cada mesa dice número, aforo, comensales sentados, estado y reserva, sin minutos ni camarero. El estado sale también en la columna Libres de **Zonas** y en el Estado de **Mesas** (estas dos se refrescan al abrir una mesa y al cerrarla a mano, no al cobrarla).
Entra: las mesas, sus cuentas abiertas, sus retenciones y los nombres de las personas del hub.
Sale: nada.
Si falla: un fallo al cargar el plano o la ventana no se avisa: sale vacío. Si no se puede leer quién atiende, la baldosa no lo dice.
Implicados: REC_RESTAURANTE-F05
QA: R-01, qa-hub-restaurant §04

### TABLES-F10 Sentar a un grupo en una mesa libre o reservada
Estado: parcial — sentar en una mesa Reservada gasta su reserva aunque sea para otra hora (TABLES-F28); el camarero es siempre quien abre la mesa; una mesa desactivada se rechaza con el mensaje de «otro dispositivo»; si dos TPV abren la misma mesa en el mismo instante, el servidor puede dejar pasar las dos y la mesa queda con dos cuentas (leído en el código, sin ejecutar)
Actor: empleado, cajero, responsable
Pantalla: Elegir mesa (en el TPV)
Pasos:
1. En **Ventas → Vender**, pulsa el botón de mesa de la cuenta y elige la zona.
2. Toca una mesa Disponible o Reservada. Se pregunta: «Comensales en la mesa N», con el aforo (o los comensales de la reserva) ya puesto.
3. Toca un atajo del 1 al 8 (sienta de un toque) o ajusta con «−» y «+» y pulsa «Sentar N». Más que el aforo avisa «Supera el aforo de la mesa (4)» y deja sentar. Con el ajuste de comensales apagado, el toque del paso 2 ya sienta (TABLES-F08).
4. La ventana se cierra, la mesa pasa a Ocupada y la cuenta en pantalla toma el título «Mesa N». El primer artículo que se añade crea la cuenta en Ventas y Mesas la deja enlazada a la mesa.
5. Con Cocina instalada y productos sin enviar en la cuenta de delante, la mesa no se abre: sale «Envía primero los N productos pendientes de la comanda actual.»; «Enviar comanda» los manda a cocina y entonces sienta la mesa tocada.
Entra: la mesa y los comensales; en una Reservada, sus comensales de la reserva.
Sale: la cuenta de mesa abierta con sus comensales, la hora y quien la abre como camarero (avisa: tables.session.opened); la mesa Ocupada; las reservas retenidas en esa mesa, gastadas (TABLES-F28). Ventas recibe la mesa y su título; la cuenta impresa y la comanda de cocina llevan ese título.
Si falla: si otro dispositivo ya la había ocupado, «Otro dispositivo acaba de ocupar esa mesa. Se ha actualizado el plano.», la mesa no se asigna y la ventana sigue abierta para elegir otra (el mismo texto sale con una mesa desactivada). Si los dos tocan en el mismo instante no hay garantía: la comprobación previa se hace fuera de la escritura y la escritura no bloquea la mesa, así que las dos aperturas pueden entrar (leído en el código, sin ejecutar). Una Bloqueada no se puede tocar. Otro fallo: el motivo traducido o «No se pudo ocupar la mesa».
Implicados: FLOWS-F13, RESERVATIONS-F11, SALES-F19, SALES-F20, REC_RESTAURANTE-F05, REC_WA_MESA-F10
QA: R-03, qa-hub-restaurant §06

### TABLES-F11 Volver a una mesa ocupada y cambiar de mesa en el TPV
Estado: parcial — en una mesa con dos cuentas (dividida) se abre una de ellas sin poder elegir; con una cuenta de barra delante, tocar una mesa ocupada que ya tiene pedido en Ventas deja esa mesa Disponible con su cuenta abierta (leído en el código, sin ejecutar)
Actor: empleado, cajero, responsable
Pantalla: Elegir mesa (en el TPV)
Pasos:
1. En «Elegir mesa», toca una mesa Ocupada: se abre su cuenta con sus líneas, desde cualquier tablet (la misma cuenta, no otra).
2. Tocar otra mesa cambia de cuenta: si la mesa que se deja no llegó a pedir nada, Mesas cierra su cuenta vacía y la libera; si tiene cuenta, se queda Ocupada con ella.
3. «Dejar en la mesa» en Ventas suelta la cuenta de la pantalla; la mesa sigue Ocupada y se retoma tocándola.
4. Al recargar el TPV, la cuenta que tenía delante recupera su mesa.
5. Si delante hay una cuenta de barra con productos y se toca una mesa ocupada sin pedido todavía, no se pregunta nada: la cuenta de barra pasa a esa mesa (como en TABLES-F12).
6. Si la mesa ocupada ya tiene pedido en Ventas, Ventas pregunta «Tienes una cuenta a medias» con «Aparcarla y abrir» y «Eliminarla y abrir». Pero al tocar la mesa, Mesas ya ha apuntado como cuenta «de delante» la de la mesa tocada. Aparcar la cuenta de barra avisa a Mesas de que aparque la cuenta de delante, y Mesas aparca la de la mesa tocada; eliminarla avisa de que suelte la de delante, y Mesas cierra la de la mesa tocada. En los dos casos la mesa queda Disponible, mientras Ventas abre en pantalla su pedido, que sigue abierto. Si se aparcó, esa cuenta de mesa queda «Aparcada» para siempre, también tras cobrarla (leído en el código, sin ejecutar).
Entra: la mesa tocada y su cuenta abierta.
Sale: Ventas recibe la mesa y su cuenta; la cuenta de mesa vacía que se deja, cerrada (avisa: tables.session.closed).
Si falla: con Cocina y productos sin enviar no se cambia de mesa (el mismo aviso de TABLES-F10). Si no se puede leer la cuenta de la mesa tocada, el TPV la trata como libre (y si la mesa que deja no había pedido nada, ya cerró su cuenta): pregunta los comensales y, al sentar, sale «Otro dispositivo acaba de ocupar esa mesa. Se ha actualizado el plano.».
Implicados: SALES-F17, SALES-F19, REC_RESTAURANTE-F08
QA: R-06, qa-hub-restaurant §06

### TABLES-F12 Llevar a una mesa la cuenta que ya está en pantalla
Estado: hecho
Actor: empleado, cajero, responsable
Pantalla: Elegir mesa (en el TPV)
Pasos:
1. Con una cuenta de barra (sin mesa) a medias, abre «Elegir mesa» y toca una mesa Disponible o Reservada (o una Ocupada que todavía no tiene pedido en Ventas).
2. En una libre, indica los comensales y pulsa «Sentar N» (TABLES-F10).
3. La cuenta de delante pasa a ser la de esa mesa, con todo lo que tenía; Ventas no pregunta nada más.
4. Si la cuenta de delante ya era de una mesa, tocar una mesa libre deja la cuenta en su mesa y empieza una cuenta nueva en la tocada.
Entra: la cuenta de delante, de Ventas, y la mesa.
Sale: la cuenta de mesa abierta y enlazada a esa cuenta (avisa: tables.session.opened).
Si falla: los de TABLES-F10.
Implicados: SALES-F19
QA: qa-hub-restaurant §06

### TABLES-F13 Quitar la mesa de una cuenta (aparcarla)
Estado: parcial — la cuenta aparcada no vuelve a su mesa: al retomarla y sentarla se abre otra cuenta de mesa, y la aparcada queda «Aparcada» en Sesiones para siempre, también después de cobrarla
Actor: empleado, cajero, responsable
Pantalla: Elegir mesa (en el TPV)
Pasos:
1. Con la cuenta de una mesa delante, abre «Elegir mesa» y pulsa «Quitar mesa».
2. La mesa queda Disponible para otros; la cuenta de mesa pasa a «Aparcada», sin mesa, conservando comensales, camarero y hora.
3. La cuenta sigue abierta en Ventas, que pide un nombre para aparcarla y la guarda en **Cuentas abiertas**.
4. Para seguir con ella, se abre desde **Cuentas abiertas** (sale sin mesa) y, si se sienta, se toca una mesa: Mesas abre allí otra cuenta de mesa y la enlaza.
Entra: la cuenta de mesa de delante.
Sale: la cuenta de mesa aparcada (avisa: tables.session.parked) y la mesa Disponible si no le queda otra cuenta.
Si falla: con Cocina y productos sin enviar, el aviso de TABLES-F10 y «Enviar comanda». Si aparcar falla, la pantalla suelta la mesa igual y no se avisa.
Implicados: SALES-F17
QA: qa-hub-restaurant §06

### TABLES-F14 Corregir los comensales de una mesa ocupada
Estado: hecho
Actor: empleado, cajero, responsable
Pantalla: Elegir mesa (en el TPV)
Pasos:
1. En «Elegir mesa», toca el «⋮» de la mesa ocupada y pulsa «Comensales».
2. Sale la pregunta con los comensales actuales; cámbialos con un atajo o con «−» / «+» y «Guardar».
3. La mesa enseña los comensales nuevos. En una mesa dividida se corrige una de sus cuentas, sin elegir cuál.
Entra: la cuenta abierta de la mesa.
Sale: los comensales de la cuenta (avisa: tables.session.updated).
Si falla: «Esa mesa no tiene comanda abierta»; otro fallo sale con el texto del hub sin traducir, en inglés (leído en el código, sin ejecutar). Una cuenta ya cerrada, trasladada, fusionada o aparcada no se corrige.
Implicados: ninguno
QA: qa-hub-restaurant §06

### TABLES-F15 Pasar la cuenta a otra mesa (transferir)
Estado: parcial — si la mesa de origen tenía dos cuentas (dividida), se queda Disponible con la otra cuenta todavía sentada, y se traslada una de las dos sin elegir cuál (leído en el código, sin ejecutar); los rechazos salen sin traducir
Actor: empleado, cajero, responsable
Pantalla: Elegir mesa (en el TPV)
Pasos:
1. En «Elegir mesa», toca el «⋮» de la mesa ocupada y pulsa «Transferir».
2. El título pasa a «Transferir N a…» y sale «Elige una mesa libre»: solo las Disponibles y Reservadas se pueden tocar. «Cancelar» lo deshace.
3. Toca la mesa de destino.
4. La cuenta es la misma, ahora en la mesa de destino, con sus comensales, su camarero y sus notas; la de origen queda Disponible y la de destino, Ocupada (si estaba Reservada, gasta la reserva). Si el TPV tenía delante la mesa de origen, pasa a la de destino.
5. Con la mesa de origen dividida (dos cuentas), el «⋮» traslada la cuenta que el TPV encuentra primero (la de identificador interno menor, no la que se mira), y la mesa de origen se pone Disponible sin mirar si le queda la otra cuenta sentada: el paso que la libera no lleva la comprobación «no le queda ninguna cuenta abierta» que sí llevan cerrar, cobrar y aparcar (leído en el código, sin ejecutar).
Entra: la mesa de origen, su cuenta y la mesa de destino.
Sale: la cuenta de origen «Trasladada» y una cuenta nueva en el destino con el mismo pedido (avisa: tables.session.transferred); Ventas cambia la mesa de la cuenta.
Si falla: «Esa mesa no tiene comanda abierta»; si el destino dejó de estar libre, el texto del hub sin traducir, en inglés o con el nombre técnico de la comprobación (leído en el código, sin ejecutar). Sin el permiso de trasladar (se puede quitar a un perfil), el «⋮» no ofrece «Transferir» ni «Fusionar».
Implicados: FLOWS-F13, SALES-F25, REC_RESTAURANTE-F10
QA: R-07, qa-hub-restaurant §09

### TABLES-F16 Juntar las cuentas de dos mesas ocupadas (fusionar)
Estado: parcial — la ventana ofrece como destino mesas Reservadas sin cuenta, que el hub rechaza; si la mesa de origen tenía dos cuentas, se queda Disponible con la otra sentada (leído en el código, sin ejecutar); si Ventas no consigue juntar las líneas no se ve nada; dos cuentas de la misma mesa no se pueden fusionar
Actor: empleado, cajero, responsable
Pantalla: Elegir mesa (en el TPV)
Pasos:
1. En «Elegir mesa», toca el «⋮» de la mesa que se va a juntar y pulsa «Fusionar».
2. El título pasa a «Fusionar N con…» y sale «Elige una mesa ocupada». Se pueden tocar las Ocupadas y también las Reservadas (las Bloqueadas salen apagadas). Toca la mesa que se queda.
3. La mesa de origen queda Disponible y su cuenta de mesa, «Fusionada». Con la mesa de origen dividida pasa lo mismo que al transferir (TABLES-F15): se fusiona la cuenta que el TPV encuentra primero y la mesa se pone Disponible aunque le quede la otra cuenta sentada, porque el paso que la libera no comprueba si le queda alguna (leído en el código, sin ejecutar).
4. Si solo una de las dos tenía cuenta en Ventas, esa pasa a ser la de la mesa que se queda; si las dos tenían, Ventas mueve las líneas a la de la mesa que se queda y anula la otra. El TPV sigue a la mesa que se queda.
Entra: las dos mesas y sus cuentas.
Sale: una sola cuenta abierta en la mesa que se queda (avisa: tables.session.merged); la mesa de origen Disponible.
Si falla: «Esa mesa no tiene comanda abierta»; destino Reservado sin cuenta: el texto del hub sin traducir, en inglés o con el nombre técnico de la comprobación (leído en el código, sin ejecutar). Si Ventas falla al juntar las líneas, las mesas ya están fusionadas en Mesas y las cuentas siguen separadas en Ventas, sin aviso.
Implicados: FLOWS-F13, SALES-F24, REC_RESTAURANTE-F10
QA: R-07, qa-hub-restaurant §09

### TABLES-F17 Dividir la cuenta de una mesa
Estado: parcial — solo en la misma mesa, sin deshacer (dos cuentas de una mesa no se vuelven a juntar) y al tocar la mesa luego se abre una de las dos sin elegir; al cobrar entera la cuenta nueva, Mesas cierra también la cuenta de mesa que el TPV recordaba: la original si tenía delante esa mesa, o la de OTRA mesa si tenía otra delante, y libera esa mesa con su cuenta aún abierta en Ventas (leído en el código, sin ejecutar)
Actor: empleado, cajero, responsable
Pantalla: Elegir mesa (en el TPV)
Pasos:
1. En la cuenta de la mesa, marca las líneas que se van a la cuenta nueva (en Ventas).
2. En «Elegir mesa», toca el «⋮» de la mesa y pulsa «Dividir cuenta».
3. Mesas abre una segunda cuenta en la misma mesa (1 comensal); Ventas le pasa las líneas marcadas y la deja en pantalla para cobrarla. Sin nada marcado, nace vacía.
4. Por qué falla el cobro de la cuenta nueva (leído en el código, sin ejecutar): al dividir, Mesas no cambia la cuenta de mesa que el TPV recuerda como «de delante» (la de la mesa que tenía seleccionada, que puede ser otra), pero Ventas pone en pantalla la cuenta nueva. Al cobrarla entera, el TPV pide a Mesas cerrar la cuenta que recuerda, y además el aviso de cuenta cobrada cierra la nueva. Sin cuentas abiertas, esa mesa queda Disponible aunque su cuenta siga abierta en Ventas. Solo cuando el TPV que cobra recuerda justo esa cuenta nueva (por ejemplo, tras recargar con ella en pantalla) o ninguna, la mesa sigue Ocupada mientras le quede la otra cuenta.
Entra: la cuenta abierta de la mesa.
Sale: dos cuentas de mesa abiertas en la misma mesa, la nueva colgando de la original (avisa: tables.session.split); Ventas engancha su cuenta nueva a la segunda.
Si falla: «Esa mesa no tiene comanda abierta»; otro fallo, el texto del hub sin traducir (leído en el código, sin ejecutar). Si el fallo es de Ventas, Mesas ya abrió la segunda cuenta y la mesa se queda con una cuenta vacía de más.
Implicados: FLOWS-F13, SALES-F23, REC_RESTAURANTE-F10
QA: R-07, qa-hub-restaurant §09 (discrepa)
