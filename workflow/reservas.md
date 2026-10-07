# WORKFLOW — Mesas · Reservas en el plano

Prefijo: TABLES

Una **retención** es una mesa apartada para una reserva: nadie se ha sentado todavía, no es una
cuenta. Mesas no lee el libro de Reservas: se entera por sus avisos y guarda su propia retención,
que pinta la mesa Reservada en el plano y en «Elegir mesa» con el nombre y la hora de la reserva.
La retención guarda también de qué ficha de cliente es, para poder olvidar su nombre si se borran
sus datos (TABLES-F31), y una retención que termina (gastada, soltada o caducada) deja de guardar
el nombre: ninguna pantalla la vuelve a pintar.

## Flujos

### TABLES-F25 Retener la mesa de una reserva confirmada
Estado: parcial — solo retiene la reserva que ya tiene mesa y pasa a Confirmada después de nacer (una que nace Confirmada nunca retiene); pinta la mesa Reservada desde el momento de confirmar aunque la reserva sea para otro día; si la mesa estaba Ocupada al confirmar, al liberarse vuelve a Disponible y no a Reservada; y desde las pantallas de Reservas no se puede poner mesa a una reserva: solo con el asistente
Actor: sistema
Pantalla: ninguna
Pasos:
1. En Reservas, una reserva con mesa pasa de Pendiente a Confirmada (su «Confirmar» o el asistente). La mesa se le pone a la reserva con el asistente: las pantallas de Reservas no tienen campo de mesa.
2. Mesas aparta esa mesa para la reserva desde su fecha y hora hasta que acaba su duración (120 minutos si no trae), con sus comensales y su nombre.
3. Si la mesa estaba Disponible, pasa al momento a Reservada en el plano y en «Elegir mesa», con «Ana · 21:00». Si estaba Ocupada o Bloqueada no se repinta, pero el nombre de la reserva sale igual sobre la mesa.
4. Una mesa puede tener varias reservas retenidas; el plano enseña la más temprana.
Entra: de Reservas, el cambio de estado de la reserva con su mesa, fecha, hora, duración, comensales y nombre.
Sale: la retención de la mesa (con el nombre y la ficha de cliente de la reserva, si la tiene) y la mesa Reservada. No avisa a nadie. Si la confirmación llega dos veces, sigue habiendo una sola retención.
Si falla: una mesa borrada o desactivada no se retiene, sin aviso. Nada impide dos reservas en la misma mesa a la misma hora: las dos se retienen.
Implicados: RESERVATIONS-F04, RESERVATIONS-F07, REC_RESTAURANTE-F04, REC_WA_MESA-F06
QA: R-02, qa-hub-restaurant §05

### TABLES-F26 Mover o soltar la retención cuando cambia la reserva
Estado: parcial — cambiar la fecha, la hora o la duración de la reserva no mueve la retención; poner mesa a una reserva que no la tenía retenida no la retiene
Actor: sistema
Pantalla: ninguna
Pasos:
1. En Reservas (hoy con el asistente) se cambia la mesa de una reserva que tenía su mesa retenida.
2. Mesas mueve la retención a la mesa nueva: la nueva pasa a Reservada si estaba Disponible y la vieja vuelve a Disponible si no le queda otra reserva retenida ni gente sentada.
3. Si a la reserva se le quita la mesa, Mesas suelta la retención y devuelve la mesa.
4. Si cambian la fecha, la hora, la duración, los comensales o el nombre, la retención se queda como estaba.
Entra: de Reservas, el cambio de la reserva con los campos que cambiaron.
Sale: la retención movida (con su nombre) o soltada (sin nombre); las mesas repintadas. No avisa a nadie.
Si falla: una mesa nueva borrada o desactivada no recibe la retención y la reserva sigue retenida en la vieja.
Implicados: RESERVATIONS-F08, REC_RESTAURANTE-F04
QA: qa-hub-restaurant §05 (discrepa)

### TABLES-F27 Soltar la mesa cuando la reserva se cancela, no se presenta o se borra
Estado: parcial — borrar una reserva no suelta su mesa: sigue Reservada hasta que la retención caduca (TABLES-F29)
Actor: sistema
Pantalla: ninguna
Pasos:
1. En Reservas, una reserva se cancela o se marca como no presentada.
2. Mesas suelta su retención y, si la mesa no tiene otra reserva retenida ni gente sentada, la devuelve a Disponible al momento.
3. Una retención que ya se gastó (la gente se sentó) no se toca.
4. Si la reserva se borra, Mesas no se entera y la mesa sigue Reservada.
Entra: de Reservas, el cambio de estado a cancelada o no presentada.
Sale: la retención soltada, ya sin el nombre, y la mesa libre. No avisa a nadie.
Si falla: si el aviso se repite, no cambia nada.
Implicados: RESERVATIONS-F09, RESERVATIONS-F10, RESERVATIONS-F20, REC_RESTAURANTE-F04
QA: R-02, qa-hub-restaurant §05

### TABLES-F28 Gastar la retención al sentar a la reserva
Estado: parcial — «Sentar» en Reservas no abre la mesa ni gasta la retención: la gasta abrir la mesa en el TPV; y sentar a cualquiera en esa mesa (también un grupo sin reserva horas antes) gasta todas sus reservas retenidas
Actor: empleado, cajero, responsable
Pantalla: Elegir mesa (en el TPV)
Pasos:
1. Llega el grupo de la reserva. En Reservas, «Sentar» la pasa a Sentada, pero la mesa sigue Reservada.
2. En **Ventas → Vender**, «Elegir mesa», toca la mesa Reservada: la pregunta de comensales viene con los de la reserva. Pulsa «Sentar N» (TABLES-F10).
3. La mesa pasa a Ocupada y su retención queda gastada (la reserva cumplió). Trasladar o dividir una cuenta a esa mesa, o volver a sentar allí una aparcada, también la gasta.
Entra: la mesa Reservada.
Sale: la retención gastada, y con ella la de cualquier otra reserva retenida en esa mesa, todas ya sin nombre; la cuenta de mesa abierta (TABLES-F10).
Si falla: los de TABLES-F10. Si nadie abre la mesa, la retención espera a caducar (TABLES-F29). «Sentar» o «Completar» en Reservas con la mesa Disponible la vuelven a pintar Reservada mientras la retención siga viva.
Implicados: RESERVATIONS-F11, REC_RESTAURANTE-F05, REC_WA_MESA-F10
QA: R-02, R-03, qa-hub-restaurant §06

### TABLES-F29 Caducar las retenciones vencidas
Estado: parcial — compara la hora de la reserva (la del negocio) con la del servidor en UTC, así que en la península caduca 2 horas tarde en verano y 1 en invierno, más hasta 15 minutos del repaso (leído en el código, sin ejecutar)
Actor: sistema
Pantalla: ninguna
Pasos:
1. Cada 15 minutos, Mesas repasa las retenciones vivas cuya ventana (hora de la reserva más su duración) ya pasó.
2. Las marca como caducadas (la reserva no llegó a sentarse en esa mesa).
3. Cada mesa Reservada que se queda sin reserva retenida y sin gente sentada vuelve a Disponible (también la puesta Reservada a mano, TABLES-F04).
4. Por qué caduca tarde (leído en el código, sin ejecutar): el final de la retención se guarda como hora de pared de la reserva, sin zona (p. ej. 23:00), y el repaso la compara como texto con la hora del servidor, que es UTC. Las 23:00 de la reserva solo quedan atrás cuando son las 23:00 en UTC: la 01:00 en Madrid en verano y las 00:00 en invierno. El hub entrega la zona del negocio, pero Mesas no la usa.
Entra: la hora del servidor.
Sale: las retenciones caducadas, ya sin nombre, y las mesas libres (avisa: tables.table.hold_released, en cada repaso, aunque no caduque ninguna).
Si falla: se reintenta en el siguiente repaso; si el hub estuvo parado, al volver hace un solo repaso.
Implicados: RESERVATIONS-F11, RESERVATIONS-F20, REC_RESTAURANTE-F04
QA: R-02

### TABLES-F30 Retener o soltar una mesa a mano
Estado: parcial — sin pantalla: solo con el asistente
Actor: responsable, empleado, cajero, asistente
Pantalla: asistente
Pasos:
1. Pide al asistente apartar una mesa («guarda la 6 para Pedro de 21:00 a 23:00, 4 personas»).
2. La mesa pasa a Reservada si estaba Disponible, con el nombre y la hora; pedirlo otra vez con la misma referencia cambia la misma retención.
3. Para soltarla, pide soltarla con la misma referencia: la mesa vuelve a Disponible si no le queda otra reserva ni gente.
Entra: mesa, origen y referencia, desde, hasta, comensales y nombre.
Sale: la retención, sin ficha de cliente (avisa: tables.table.held), o su liberación, que borra el nombre (avisa: tables.table.hold_released).
Si falla: «Esa mesa no existe en este negocio.»; soltar una retención que ya no está: «Esa retención ya no está: se soltó, ha vencido, o esa reserva nunca llegó a retener una mesa.».
Implicados: ninguno
QA: ninguno

### TABLES-F31 Olvidar el nombre de un cliente cuyos datos se borran (RGPD)
Estado: parcial — una retención sin ficha (reserva apuntada a mano sin cliente, o retenida a mano con el asistente) y las que ya estaban vivas antes de esta versión no se encuentran por cliente: guardan el nombre hasta que terminan (gastada, soltada o caducada); al fusionar dos fichas en Clientes la retención sigue apuntando a la ficha absorbida (tables#127)
Actor: sistema
Pantalla: Plano de sala, Elegir mesa (en el TPV)
Pasos:
1. En **Clientes** el administrador borra los datos personales de una ficha.
2. Todas las retenciones de mesa de esa clienta en este negocio, vivas o terminadas y también las
   borradas, se quedan sin su nombre.
3. La mesa sigue Reservada a su hora: en el **Plano de sala** y en «Elegir mesa», donde estaba el
   nombre se lee «Cliente borrado · 21:00»; el título y el nombre accesible de la mesa dicen
   «Reservada para Cliente borrado».
Entra: el aviso de borrado de la ficha (`customer.anonymized`) con su identificador.
Sale: retenciones sin el nombre de la clienta. Se quedan la mesa, la hora de inicio y fin, los
comensales, el estado, la referencia de la reserva y el enlace a la ficha (que ya no tiene datos):
el plano sigue sabiendo que la mesa está apartada. No avisa a nadie y no suelta ninguna mesa.
Si falla: no hay nada que ver en pantalla; el hub reintenta el aviso hasta que entra, y repetirlo no
cambia nada más. Una ficha de otro negocio con el mismo identificador no se toca, y un aviso sin
identificador no toca las retenciones sin ficha.
Implicados: pendiente
Pendiente de enlazar: customers — CUSTOMERS-F16 (borrar los datos personales de un cliente: emite el aviso que Mesas escucha)
Pendiente de enlazar: reservations — RESERVATIONS-F22 (su borrado dice que la etiqueta de la mesa la vacía Mesas)
Pendiente de enlazar: hub — HUB-F250 (lo que le toca a cada app al recibir el aviso de borrado; se actualiza al cerrar la familia pm#637)
QA: ninguno
