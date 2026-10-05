# WORKFLOW — Mesas · Reservas en el plano

Prefijo: TABLES

Una **retención** es una mesa apartada para una reserva: nadie se ha sentado todavía, no es una
cuenta. Mesas no lee el libro de Reservas: se entera por sus avisos y guarda su propia retención,
que pinta la mesa Reservada en el plano y en «Elegir mesa» con el nombre y la hora de la reserva.

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
Sale: la retención de la mesa y la mesa Reservada. No avisa a nadie. Si la confirmación llega dos veces, sigue habiendo una sola retención.
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
Sale: la retención movida o soltada; las mesas repintadas. No avisa a nadie.
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
Sale: la retención soltada y la mesa libre. No avisa a nadie.
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
Sale: la retención gastada, y con ella la de cualquier otra reserva retenida en esa mesa; la cuenta de mesa abierta (TABLES-F10).
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
Sale: las retenciones caducadas y las mesas libres (avisa: tables.table.hold_released, en cada repaso, aunque no caduque ninguna).
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
Sale: la retención (avisa: tables.table.held) o su liberación (avisa: tables.table.hold_released).
Si falla: «Esa mesa no existe en este negocio.»; soltar una retención que ya no está: «Esa retención ya no está: se soltó, ha vencido, o esa reserva nunca llegó a retener una mesa.».
Implicados: ninguno
QA: ninguno
