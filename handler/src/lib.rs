//! Handlers WASM (Tier 2) del módulo `tables` — WASM-TODO.md.
//!
//! Siete funciones exportadas (lógica pura, sin BD: reciben `{payload, context}`
//! y devuelven **intenciones** — ops SQL por nombre de command del mismo módulo —
//! que el host valida y ejecuta en UNA transacción):
//!
//! * `bulk_create_tables` — alta en lote: itera `count` veces, calcula
//!   `number = {prefix}{start_number + i}` y reparte la posición en una rejilla
//!   de PÍXELES del plano (`x = GAP + (i % COLS) * CELL`, ídem `y`, caja `BOX`),
//!   la misma unidad que dibuja el lienzo (tables#53). N intenciones de
//!   `tables._insert_table` (cada una con gate `zone_exists`).
//! * `open_session` — delega en `tables._session_open`: INSERT condicional
//!   (mesa `available`) + UPDATE mesa `occupied` + assert (gate `table_available`).
//!   El warning de aforo (`guests_count > capacity`) no bloquea y queda en la UI
//!   (el host no pre-carga lecturas y el `Output` no tiene canal de warnings).
//! * `close_session` — `tables._session_close`: UPDATE condicional (sesión
//!   `active`) con merge de notas + liberar mesa + assert (gate `session_active`).
//! * `transfer_session` — `tables._session_transfer`: 4 escrituras encadenadas
//!   (origen `transferred`, libera mesa origen, sesión nueva en destino con
//!   `transferred_from_id`, destino `occupied`) + assert (gate `transfer_applied`).
//! * `delete_zone` — `tables._zone_delete`: soft-delete condicional (sin mesas
//!   activas) + assert (gate `zone_without_active_tables` ≈ error `tables_attached`).
//! * `delete_table` — `tables._table_delete`: soft-delete condicional (sin
//!   sesiones activas) + assert (gate ≈ error `active_sessions`).
//! * `delete_session` — `tables._session_delete`: soft-delete condicional
//!   (sesión no `active`) + assert.
//!
//! Las guardas dependientes del estado ACTUAL se aplican en el SQL de los
//! commands privados con UPDATE/INSERT condicional + assert sobre la tabla
//! guardia `tables__gate` (CHECK ok = 1) — mismo patrón que `reservations`.
//! Ids: el host pasa `context.new_ids` (autoridad de ids); el guest solo los
//! reparte. El guest no toca la BD ni genera ids.

use erplora_guest_sdk::{DomainError, Operation, Output};
use serde_json::{json, Map, Value};

#[cfg(feature = "guest")]
use extism_pdk::*;

#[cfg(feature = "guest")]
fn guest_err(msg: String) -> WithReturnCode<Error> {
    WithReturnCode::new(Error::msg(msg), 1)
}

#[cfg(feature = "guest")]
#[plugin_fn]
pub fn bulk_create_tables(input: Json<erplora_guest_sdk::Input>) -> FnResult<Json<Output>> {
    bulk_create_tables_pure(input.into_inner().into_value())
        .map(Json)
        .map_err(guest_err)
}

#[cfg(feature = "guest")]
#[plugin_fn]
pub fn open_session(input: Json<erplora_guest_sdk::Input>) -> FnResult<Json<Output>> {
    open_session_pure(input.into_inner().into_value())
        .map(Json)
        .map_err(guest_err)
}

#[cfg(feature = "guest")]
#[plugin_fn]
pub fn close_session(input: Json<erplora_guest_sdk::Input>) -> FnResult<Json<Output>> {
    close_session_pure(input.into_inner().into_value())
        .map(Json)
        .map_err(guest_err)
}

#[cfg(feature = "guest")]
#[plugin_fn]
pub fn transfer_session(input: Json<erplora_guest_sdk::Input>) -> FnResult<Json<Output>> {
    transfer_session_pure(input.into_inner().into_value())
        .map(Json)
        .map_err(guest_err)
}

#[cfg(feature = "guest")]
#[plugin_fn]
pub fn merge_session(input: Json<erplora_guest_sdk::Input>) -> FnResult<Json<Output>> {
    merge_session_pure(input.into_inner().into_value())
        .map(Json)
        .map_err(guest_err)
}

#[cfg(feature = "guest")]
#[plugin_fn]
pub fn split_session(input: Json<erplora_guest_sdk::Input>) -> FnResult<Json<Output>> {
    split_session_pure(input.into_inner().into_value())
        .map(Json)
        .map_err(guest_err)
}

#[cfg(feature = "guest")]
#[plugin_fn]
pub fn delete_zone(input: Json<erplora_guest_sdk::Input>) -> FnResult<Json<Output>> {
    delete_zone_pure(input.into_inner().into_value())
        .map(Json)
        .map_err(guest_err)
}

#[cfg(feature = "guest")]
#[plugin_fn]
pub fn delete_table(input: Json<erplora_guest_sdk::Input>) -> FnResult<Json<Output>> {
    delete_table_pure(input.into_inner().into_value())
        .map(Json)
        .map_err(guest_err)
}

#[cfg(feature = "guest")]
#[plugin_fn]
pub fn delete_session(input: Json<erplora_guest_sdk::Input>) -> FnResult<Json<Output>> {
    delete_session_pure(input.into_inner().into_value())
        .map(Json)
        .map_err(guest_err)
}

// ── helpers puros ────────────────────────────────────────────────────────────

fn as_str(v: &Value) -> String {
    match v {
        Value::String(s) => s.clone(),
        Value::Number(n) => n.to_string(),
        Value::Bool(b) => b.to_string(),
        _ => String::new(),
    }
}

fn as_i64(v: &Value) -> Option<i64> {
    match v {
        Value::Number(n) => n.as_i64().or_else(|| n.as_f64().map(|f| f as i64)),
        Value::String(s) => s.trim().parse::<i64>().ok(),
        _ => None,
    }
}

fn req_str(payload: &Value, key: &str) -> Result<String, String> {
    let s = as_str(payload.get(key).unwrap_or(&Value::Null));
    let s = s.trim().to_string();
    if s.is_empty() {
        return Err(format!("`{key}` es obligatorio"));
    }
    Ok(s)
}

fn payload_and_ids(input: &Value) -> (Value, Vec<Value>) {
    let payload = input.get("payload").cloned().unwrap_or(Value::Null);
    let new_ids = input
        .pointer("/context/new_ids")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    (payload, new_ids)
}

fn opt_str(payload: &Value, key: &str) -> Value {
    let v = payload.get(key).cloned().unwrap_or(Value::Null);
    match &v {
        Value::String(s) if s.trim().is_empty() => Value::Null,
        _ => v,
    }
}

/// Who is serving the check (tables#70).
///
/// The payload when it names somebody, else the user with the session open on the terminal. It is
/// the SAME rule `sales` settled in sales#179 for `staff_id` / `waiter_id`, and the market one
/// (Toast, Square for Restaurants, Lightspeed): the server is pinned to the check from the moment
/// it opens — by default whoever is logged in — and stays transferable afterwards.
///
/// A blank string is NOT an attribution: the POS sends `null` and integrations send `""`, and a
/// blank waiter persisted on the row is worse than NULL because it looks like somebody. Both fall
/// back to the signed-in user.
///
/// `context.current_user_id` is injected by the runtime into every handler input and cannot be
/// forged by the caller, so resolving it HERE (and not in the SQL) is what lets the attribution
/// travel in the `tables.session.opened` event as well. If the runtime handed no user at all the
/// value stays NULL — the session still opens, because refusing to seat a table over a missing
/// attribution would be a worse defect than the one this closes.
fn waiter_or_signed_in_user(payload: &Value, input: &Value) -> Value {
    match opt_str(payload, "waiter_id") {
        Value::Null => {
            let user = as_str(
                input
                    .pointer("/context/current_user_id")
                    .unwrap_or(&Value::Null),
            );
            if user.trim().is_empty() {
                Value::Null
            } else {
                json!(user)
            }
        }
        named => named,
    }
}

// ── guardas de estado sobre las filas PRE-CARGADAS (`reads`, ADR-0069 — tables#55) ───────────
//
// Las tres guardas del módulo vivían solo en el SQL interno (escritura condicional + assert sobre
// `tables__gate`, ADR-0020) y quien abortaba era el `CHECK (ok = 1)` de Postgres, así que el
// hostelero leía la violación de constraint —la MISMA para las tres— en vez de saber qué había
// pasado. `expect_rows` no llega aquí: la gate de filas afectadas no cuenta las operaciones que
// devuelve un handler (tasks#26). La guarda va, pues, donde el handler sí puede verla: sobre las
// filas que el runtime pre-carga y le entrega en `context.reads`.
//
// El SQL sigue guardando y no se toca: es la red de la CARRERA (dos TPV pidiendo la misma mesa en
// el mismo instante), que ninguna lectura previa puede cerrar. Lo que deja de ser es la ÚNICA
// puerta, que era el defecto.

/// La(s) fila(s) que el runtime pre-cargó para una `reads` declarada.
///
/// `None` = el runtime no pre-cargó nada (manifest/runtime desincronizados). Se degrada al
/// comportamiento de siempre —la guarda del SQL sigue ahí— en vez de convertir un fallo de
/// plomería en un rechazo de negocio: un TPV que no puede sentar a nadie porque una lectura no
/// resolvió es peor que el defecto que arregla esto.
fn preloaded(input: &Value, query: &str) -> Option<Vec<Value>> {
    let rows = input.pointer("/context/reads")?.get(query)?;
    Some(match rows {
        Value::Array(a) => a.clone(),
        // Tolera la forma paginada `{rows, total}` por si la read apunta a una query `list`.
        Value::Object(_) => rows
            .get("rows")
            .and_then(|v| v.as_array())
            .cloned()
            .unwrap_or_default(),
        _ => Vec::new(),
    })
}

/// Rechazo de negocio: el host descarta operaciones y eventos y le entrega el código al caller,
/// que lo traduce con `locales/<lang>.json → errors` (ADR-0055). El código va SIEMPRE en el
/// namespace `tables.` — el host rechaza uno ajeno (`valid_domain_code`, hub#139).
fn reject(code: &str, message: &str) -> Output {
    Output::new().with_error(DomainError::new(code, message))
}

/// Estados en los que se puede sentar a alguien. tables#12: `reserved` SÍ — de eso va la reserva,
/// llega Ana y la sientas. `occupied` y `blocked` quedan fuera. Espejo exacto del `IN (…)` de
/// `_session_open_insert.sql`: si divergen, el handler acepta lo que el SQL luego rechaza y
/// volvemos al mensaje de la constraint.
const SEATABLE: [&str; 2] = ["available", "reserved"];

// ── geometría del plano (tables#53) ──────────────────────────────────────────
//
// Las mesas se generan aquí y se dibujan en `ui/components/erp-tables-canvas`, y hasta tables#53
// cada mitad usaba SU unidad: el generador repartía en una rejilla de paso 20 con cajas de 10, y
// el lienzo pintaba cajas de 72 px en las coordenadas crudas. Con paso 20 y caja de 72 el solape
// es aritmético —56 px, el 74 % del ancho—, así que de las 12 mesas del Salón se leían dos
// números. La unidad es UNA: el PÍXEL del plano, y estos son sus valores. Si cambian aquí, cambian
// en `erp-tables-canvas.ts` (mismos nombres) — y si alguna vez divergen, la red del lienzo
// (auto-layout por solape) lo tapa sin que nadie vea una pila.
const BOX: i64 = 72; // lado de la caja de mesa, en px del plano
const GAP: i64 = 16; // hueco entre cajas: sin él la sala es una cuadrícula sólida e ilegible
const CELL: i64 = BOX + GAP; // paso de la rejilla (una mesa por celda)
const COLS: i64 = 5; // mesas por fila del lote
/// Por debajo de esto un `width`/`height` no es una caja que alguien eligiera: es el residuo de la
/// unidad vieja (10). Ni el generador lo emite ni el plano lo respeta.
const MIN_BOX: i64 = 24;

// ── bulk_create_tables ───────────────────────────────────────────────────────

/// Máximo de mesas por lote: acotado por el lote de ids del host
/// (`context.new_ids`, 256) con margen — y por sensatez operativa.
const BULK_MAX: i64 = 100;

/// `{payload, context}` → N intenciones `tables._insert_table`.
pub fn bulk_create_tables_pure(input: Value) -> Result<Output, String> {
    let (payload, new_ids) = payload_and_ids(&input);

    let zone_id = req_str(&payload, "zone_id")?;
    let count = as_i64(payload.get("count").unwrap_or(&Value::Null))
        .filter(|n| (1..=BULK_MAX).contains(n))
        .ok_or(format!("`count` debe ser un entero entre 1 y {BULK_MAX}"))?;
    let prefix = as_str(payload.get("prefix").unwrap_or(&Value::Null));
    let start_number = payload
        .get("start_number")
        .and_then(as_i64)
        .filter(|n| *n >= 0)
        .unwrap_or(1);
    let capacity = payload
        .get("capacity")
        .and_then(as_i64)
        .filter(|n| *n >= 1)
        .unwrap_or(4);
    let shape = {
        let s = as_str(payload.get("shape").unwrap_or(&Value::Null));
        if s.is_empty() {
            "square".to_string()
        } else {
            s
        }
    };
    if !matches!(shape.as_str(), "square" | "round" | "rectangle") {
        return Err(format!(
            "`shape` inválido: `{shape}` (square|round|rectangle)"
        ));
    }

    if new_ids.len() < count as usize {
        return Err("context.new_ids insuficiente: el host no entregó ids para el lote".into());
    }

    let mut ops = Vec::with_capacity(count as usize);
    for i in 0..count {
        let table_id = as_str(&new_ids[i as usize]);
        if table_id.is_empty() {
            return Err("context.new_ids contiene un id vacío".into());
        }
        let mut p = Map::new();
        p.insert("table_id".into(), json!(table_id));
        p.insert("zone_id".into(), json!(zone_id));
        p.insert(
            "number".into(),
            json!(format!("{prefix}{}", start_number + i)),
        );
        p.insert("name".into(), json!(""));
        p.insert("capacity".into(), json!(capacity));
        // tables#53: píxeles del plano, con la caja que el plano va a pintar. El paso es
        // `BOX + GAP`, así que dos mesas del lote no pueden solaparse por construcción.
        p.insert("position_x".into(), json!(GAP + (i % COLS) * CELL));
        p.insert("position_y".into(), json!(GAP + (i / COLS) * CELL));
        p.insert("width".into(), json!(BOX));
        p.insert("height".into(), json!(BOX));
        p.insert("shape".into(), json!(shape));
        ops.push(Operation::sql("tables._insert_table", p));
    }

    // El evento `tables.table.created` lo emite el command (declarado en module.json).
    Ok(Output {
        operations: ops,
        events: vec![],
        ..Default::default()
    })
}

// ── sesiones ─────────────────────────────────────────────────────────────────

/// `{payload, context}` → intención `tables._session_open`.
pub fn open_session_pure(input: Value) -> Result<Output, String> {
    let (payload, new_ids) = payload_and_ids(&input);

    let table_id = req_str(&payload, "table_id")?;
    let guests_count = match payload.get("guests_count") {
        None | Some(Value::Null) => 1,
        Some(v) => as_i64(v)
            .filter(|n| *n >= 1)
            .ok_or("`guests_count` debe ser un entero >= 1")?,
    };
    let session_id = new_ids
        .first()
        .map(as_str)
        .filter(|s| !s.is_empty())
        .ok_or("context.new_ids vacío: el host no entregó ids")?;

    // tables#55: la mesa se comprueba contra la fila pre-cargada, no contra lo que diga el
    // navegador. Sentar en una mesa ocupada es la carrera de tables#14 vista desde el lado
    // determinista, y el TPV solo puede decir «otro dispositivo acaba de ocupar esa mesa» si le
    // llega ESTE código y no el genérico de la constraint.
    if let Some(rows) = preloaded(&input, "tables.tables.get") {
        match rows.first() {
            None => {
                return Ok(reject(
                    "tables.table_not_found",
                    "That table does not exist in this business.",
                ))
            }
            Some(table) => {
                let status = as_str(table.get("status").unwrap_or(&Value::Null));
                let active = as_i64(table.get("is_active").unwrap_or(&Value::Null)).unwrap_or(1);
                if active == 0 || !SEATABLE.contains(&status.as_str()) {
                    return Ok(reject(
                        "tables.table_not_available",
                        "That table cannot be seated right now: it is taken, out of service or no longer in use.",
                    ));
                }
            }
        }
    }

    let mut p = Map::new();
    p.insert("session_id".into(), json!(session_id));
    p.insert("table_id".into(), json!(table_id));
    p.insert("guests_count".into(), json!(guests_count));
    // tables#70: the check is never born unattributed — payload, else the signed-in user.
    p.insert("waiter_id".into(), waiter_or_signed_in_user(&payload, &input));
    p.insert(
        "notes".into(),
        json!(as_str(payload.get("notes").unwrap_or(&Value::Null))),
    );
    // ADR-0141: la sesión es la JUNCTION mesa↔pedido. `order_id` (opcional) enlaza esta mesa con el
    // pedido abierto de `sales`. `tables` OWNea la asociación; `sales` no conoce la mesa.
    p.insert("order_id".into(), opt_str(&payload, "order_id"));

    // El evento `tables.session.opened` lo emite el command (declarado).
    Ok(Output {
        operations: vec![Operation::sql("tables._session_open", p)],
        events: vec![],
        ..Default::default()
    })
}

/// `{payload, context}` → intención `tables._session_close`.
///
/// tables#124: closing by hand used to free a table whose bill was still open in sales, and the
/// bill lost its table. Like Toast, Square or Lightspeed, a table with an open bill is only let go
/// by charging, moving or deleting that bill. The caller names the bill (`order_id`) because the
/// sales read can only take its params from the payload; the session row says which bill really
/// hangs from the check, and `_session_close_update.sql` re-checks it inside the write.
pub fn close_session_pure(input: Value) -> Result<Output, String> {
    let (payload, _) = payload_and_ids(&input);

    let session_id = req_str(&payload, "session_id")?;
    let named_order = opt_str(&payload, "order_id");

    if let Some(rows) = preloaded(&input, "tables.sessions.get") {
        let Some(session) = rows.first().filter(|s| as_str(&s["status"]) == "active") else {
            return Ok(reject(
                "tables.session_not_active",
                "That check is not open: it does not exist in this business, or it has already been closed, transferred, merged or parked.",
            ));
        };
        let bill = as_str(&session["order_id"]);
        if !bill.is_empty() {
            if as_str(&named_order) != bill {
                return Ok(reject(
                    "tables.session_bill_mismatch",
                    "This table's bill has changed. Reload the list and try again.",
                ));
            }
            // Absent read = sales is not installed (graceful read): no till can charge that bill.
            let still_open = preloaded(&input, "sales.order.get")
                .is_some_and(|orders| orders.iter().any(|o| as_str(&o["status"]) == "open"));
            if still_open {
                return Ok(reject(
                    "tables.session_bill_open",
                    "This table's bill is still open in Sales: charge it, move it to another table or delete it from the till.",
                ));
            }
        }
    }

    let mut p = Map::new();
    p.insert("session_id".into(), json!(session_id));
    p.insert("order_id".into(), named_order);
    p.insert("notes".into(), opt_str(&payload, "notes"));

    Ok(Output {
        operations: vec![Operation::sql("tables._session_close", p)],
        events: vec![],
        ..Default::default()
    })
}

/// `{payload, context}` → intención `tables._session_transfer`.
pub fn transfer_session_pure(input: Value) -> Result<Output, String> {
    let (payload, new_ids) = payload_and_ids(&input);

    let session_id = req_str(&payload, "session_id")?;
    let target_table_id = req_str(&payload, "target_table_id")?;
    let new_session_id = new_ids
        .first()
        .map(as_str)
        .filter(|s| !s.is_empty())
        .ok_or("context.new_ids vacío: el host no entregó ids")?;

    let mut p = Map::new();
    p.insert("session_id".into(), json!(session_id));
    p.insert("target_table_id".into(), json!(target_table_id));
    p.insert("new_session_id".into(), json!(new_session_id));

    Ok(Output {
        operations: vec![Operation::sql("tables._session_transfer", p)],
        events: vec![],
        ..Default::default()
    })
}

/// `{payload, context}` → intención `tables._session_merge`.
///
/// Fusiona la comanda de la sesión origen (`session_id`) en la mesa destino OCUPADA
/// (`target_table_id`). El handler es puro: NO conoce la sesión activa del destino
/// (`merged_into_id`) ni el estado vivo — el SQL interno `tables._session_merge` cierra
/// la sesión origen (`merged`, `merged_into_id` = sesión activa del destino por subquery),
/// libera la mesa origen y asegura por gate que ambas estaban en el estado esperado. A
/// diferencia de `transfer`, NO crea sesión nueva → no consume `context.new_ids`.
pub fn merge_session_pure(input: Value) -> Result<Output, String> {
    let (payload, _) = payload_and_ids(&input);

    let session_id = req_str(&payload, "session_id")?;
    let target_table_id = req_str(&payload, "target_table_id")?;

    let mut p = Map::new();
    p.insert("session_id".into(), json!(session_id));
    p.insert("target_table_id".into(), json!(target_table_id));

    Ok(Output {
        operations: vec![Operation::sql("tables._session_merge", p)],
        events: vec![],
        ..Default::default()
    })
}

/// `{payload, context}` → intención `tables._session_split`.
///
/// Divide la cuenta: abre una SEGUNDA sesión viva sobre la misma mesa (o sobre otra, si media
/// mesa se muda) sin cerrar la original. El handler es puro: no sabe en qué mesa está la cuenta
/// origen — si no le mandan `target_table_id`, deja el destino en NULL y el SQL interno lo
/// resuelve como «la mesa de la sesión origen». La cuenta nueva nace SIN pedido: el pedido lo
/// materializa `sales` y lo engancha después con `tables.sessions.link_order`.
pub fn split_session_pure(input: Value) -> Result<Output, String> {
    let (payload, new_ids) = payload_and_ids(&input);

    let session_id = req_str(&payload, "session_id")?;
    let new_session_id = new_ids
        .first()
        .map(as_str)
        .filter(|s| !s.is_empty())
        .ok_or("context.new_ids vacío: el host no entregó ids")?;
    let guests_count = match payload.get("guests_count") {
        None | Some(Value::Null) => 1,
        Some(v) => as_i64(v)
            .filter(|n| *n >= 1)
            .ok_or("`guests_count` debe ser un entero >= 1")?,
    };

    let mut p = Map::new();
    p.insert("session_id".into(), json!(session_id));
    p.insert("new_session_id".into(), json!(new_session_id));
    p.insert(
        "target_table_id".into(),
        opt_str(&payload, "target_table_id"),
    );
    p.insert("guests_count".into(), json!(guests_count));
    p.insert(
        "notes".into(),
        json!(as_str(payload.get("notes").unwrap_or(&Value::Null))),
    );

    Ok(Output {
        operations: vec![Operation::sql("tables._session_split", p)],
        events: vec![],
        ..Default::default()
    })
}

/// `{payload, context}` → intención `tables._session_delete`.
pub fn delete_session_pure(input: Value) -> Result<Output, String> {
    let (payload, _) = payload_and_ids(&input);
    let session_id = req_str(&payload, "session_id")?;
    let mut p = Map::new();
    p.insert("session_id".into(), json!(session_id));
    Ok(Output {
        operations: vec![Operation::sql("tables._session_delete", p)],
        events: vec![],
        ..Default::default()
    })
}

// ── borrados con guarda (zona / mesa) ────────────────────────────────────────

/// `{payload, context}` → intención `tables._zone_delete`.
pub fn delete_zone_pure(input: Value) -> Result<Output, String> {
    let (payload, _) = payload_and_ids(&input);
    let zone_id = req_str(&payload, "zone_id")?;

    // tables#55: «esta zona tiene mesas» es una respuesta que una persona puede usar; la violación
    // del CHECK de `tables__gate` no. Se cuenta lo MISMO que guarda `_zone_delete_update.sql`
    // (mesas vivas de la zona), así que el rechazo y la guarda no pueden discrepar.
    if let Some(rows) = preloaded(&input, "tables.zones.get") {
        match rows.first() {
            None => {
                return Ok(reject(
                    "tables.zone_not_found",
                    "That zone does not exist in this business.",
                ))
            }
            Some(zone) => {
                if as_i64(zone.get("table_count").unwrap_or(&Value::Null)).unwrap_or(0) > 0 {
                    return Ok(reject(
                        "tables.zone_has_tables",
                        "That zone still has tables. Move them to another zone or delete them first.",
                    ));
                }
            }
        }
    }

    let mut p = Map::new();
    p.insert("zone_id".into(), json!(zone_id));
    Ok(Output {
        operations: vec![Operation::sql("tables._zone_delete", p)],
        events: vec![],
        ..Default::default()
    })
}

/// `{payload, context}` → intención `tables._table_delete`.
pub fn delete_table_pure(input: Value) -> Result<Output, String> {
    let (payload, _) = payload_and_ids(&input);
    let table_id = req_str(&payload, "table_id")?;

    // tables#55: borrar una mesa con gente sentada se rechaza por su nombre. Desde tables#12 una
    // mesa puede tener MÁS DE UNA cuenta viva (cuenta dividida), de ahí el conteo.
    if let Some(rows) = preloaded(&input, "tables.tables.get") {
        match rows.first() {
            None => {
                return Ok(reject(
                    "tables.table_not_found",
                    "That table does not exist in this business.",
                ))
            }
            Some(table) => {
                if as_i64(table.get("active_session_count").unwrap_or(&Value::Null)).unwrap_or(0) > 0
                {
                    return Ok(reject(
                        "tables.table_has_active_session",
                        "That table still has an open check. Close or move it before deleting the table.",
                    ));
                }
            }
        }
    }

    let mut p = Map::new();
    p.insert("table_id".into(), json!(table_id));
    Ok(Output {
        operations: vec![Operation::sql("tables._table_delete", p)],
        events: vec![],
        ..Default::default()
    })
}

// ── tests (lógica pura, sin BD ni feature `guest`) ───────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    /// Entrada `{payload, context}` con los ids que el host entregaría.
    fn input(payload: Value, ids: usize) -> Value {
        let new_ids: Vec<Value> = (0..ids).map(|i| json!(format!("id-{i}"))).collect();
        json!({
            "payload": payload,
            "context": { "hub_id": "h1", "current_user_id": "u1", "now": "2026-07-18T10:00:00+00:00", "new_ids": new_ids }
        })
    }

    // ── merge_session (fusión de comandas, punto 3) ──────────────────────────

    #[test]
    fn merge_session_emite_la_intencion_con_origen_y_destino() {
        // Fusionar la comanda de la sesión origen `s-origen` en la mesa destino OCUPADA
        // `mesa-destino`. El handler es puro: no conoce la sesión activa del destino
        // (`merged_into_id`) — eso lo resuelve el SQL interno por subquery. Solo valida
        // y emite UNA intención `tables._session_merge` con {session_id, target_table_id}.
        // A diferencia de `transfer`, NO crea sesión nueva → no consume `new_ids`.
        let out = merge_session_pure(input(
            json!({ "session_id": "s-origen", "target_table_id": "mesa-destino" }),
            0,
        ))
        .expect("merge con origen y destino válidos");

        assert_eq!(out.operations.len(), 1, "una sola intención de fusión");
        let op = &out.operations[0];
        assert_eq!(op.command, "tables._session_merge");
        assert_eq!(op.params["session_id"], json!("s-origen"));
        assert_eq!(op.params["target_table_id"], json!("mesa-destino"));
        assert!(
            out.events.is_empty(),
            "el evento lo emite el command (declarado en module.json)"
        );
    }

    #[test]
    fn merge_session_exige_session_id_y_target_table_id() {
        assert!(
            merge_session_pure(input(json!({ "target_table_id": "mesa-destino" }), 0)).is_err(),
            "sin session_id (origen) debe fallar"
        );
        assert!(
            merge_session_pure(input(json!({ "session_id": "s-origen" }), 0)).is_err(),
            "sin target_table_id (destino) debe fallar"
        );
    }

    // ── ADR-0141 · la sesión de mesa es la JUNCTION mesa↔pedido ──────────────

    #[test]
    fn open_session_pasa_el_order_id_a_la_junction() {
        // ADR-0141: `tables_session` es la junction mesa↔pedido. `tables.sessions.open` acepta un
        // `order_id` (opcional) y lo pasa a la intención para persistirlo en `tables_session.order_id`.
        // Así `tables` (satélite) OWNea la asociación; `sales` no conoce la mesa (dirección invertida).
        let out = open_session_pure(input(
            json!({ "table_id": "mesa-5", "order_id": "ord-9" }),
            1,
        ))
        .expect("open con table_id + order_id");
        let op = &out.operations[0];
        assert_eq!(op.command, "tables._session_open");
        assert_eq!(
            op.params["order_id"],
            json!("ord-9"),
            "el order_id viaja a la junction"
        );
        assert_eq!(op.params["table_id"], json!("mesa-5"));

        // sin order_id (mesa ocupada antes de crear el pedido) → NULL, sigue funcionando.
        let out2 = open_session_pure(input(json!({ "table_id": "mesa-5" }), 1))
            .expect("open sin order_id");
        assert!(
            out2.operations[0].params["order_id"].is_null(),
            "order_id es opcional → NULL"
        );
    }

    // ── tables#70 · the check ALWAYS has a waiter ────────────────────────────

    #[test]
    fn open_session_defaults_the_waiter_to_the_signed_in_user() {
        // tables#70: seating a table never asked who was serving it, so every session was born
        // with `waiter_id = NULL` — no audit of who owns the check, no base to split tips, and no
        // way to tell whose bill is whose when several are open at once. The POS cannot be the one
        // to answer it: it only knows the terminal. The runtime does — it injects
        // `context.current_user_id` into every handler input and that value is NOT spoofable.
        // Same rule `sales` settled in sales#179 for `staff_id`/`waiter_id`: the payload when it
        // names somebody, else the user with the session open. Resolving it HERE and not in the
        // SQL is what lets the attribution travel in the event too.
        let out = open_session_pure(input(json!({ "table_id": "mesa-5" }), 1))
            .expect("open without a waiter in the payload");
        assert_eq!(
            out.operations[0].params["waiter_id"],
            json!("u1"),
            "an unattributed check falls back to the user with the session open"
        );
    }

    #[test]
    fn open_session_keeps_an_explicit_waiter() {
        // The default must never overwrite a real attribution: the check is TRANSFERABLE, and a
        // caller that names a waiter is the authority (a manager seating a table for someone else).
        let out = open_session_pure(input(
            json!({ "table_id": "mesa-5", "waiter_id": "u-ana" }),
            1,
        ))
        .expect("open with an explicit waiter");
        assert_eq!(
            out.operations[0].params["waiter_id"],
            json!("u-ana"),
            "an explicit waiter wins over the signed-in user"
        );
    }

    #[test]
    fn open_session_treats_a_blank_waiter_as_no_attribution() {
        // The POS sends `null` and integrations send `""`; neither is an attribution. A blank
        // string persisted as a waiter is WORSE than NULL, because it looks like somebody.
        for blank in [json!(""), json!("   "), Value::Null] {
            let out = open_session_pure(input(
                json!({ "table_id": "mesa-5", "waiter_id": blank }),
                1,
            ))
            .expect("open with a blank waiter");
            assert_eq!(
                out.operations[0].params["waiter_id"],
                json!("u1"),
                "a blank waiter is not an attribution: it falls back to the signed-in user"
            );
        }
    }

    // ── split_session (dividir la cuenta, tables#12) ─────────────────────────

    #[test]
    fn split_session_opens_a_second_check_on_the_same_table_by_default() {
        // Splitting a check is what a party asks for when they want separate bills. `tables`
        // owns the SEATING side of it: a second live session on the same table, pointing back
        // at the one it came from. The lines/amounts belong to `sales`, which links its new
        // order to the new session afterwards.
        let out = split_session_pure(input(json!({ "session_id": "s-a", "guests_count": 2 }), 1))
            .expect("split with only the source session");

        assert_eq!(out.operations.len(), 1, "one intention: the split");
        let op = &out.operations[0];
        assert_eq!(op.command, "tables._session_split");
        assert_eq!(op.params["session_id"], json!("s-a"));
        assert_eq!(
            op.params["new_session_id"],
            json!("id-0"),
            "the host owns the ids"
        );
        assert_eq!(op.params["guests_count"], json!(2));
        assert!(
            op.params["target_table_id"].is_null(),
            "no target table = the second check stays on the SAME table (the SQL resolves it)"
        );
    }

    #[test]
    fn split_session_can_move_the_second_check_to_another_table() {
        // The other half of the party moves to a free table: same command, explicit target.
        let out = split_session_pure(input(
            json!({ "session_id": "s-a", "target_table_id": "mesa-8" }),
            1,
        ))
        .expect("split towards a free table");
        assert_eq!(out.operations[0].params["target_table_id"], json!("mesa-8"));
        assert_eq!(
            out.operations[0].params["guests_count"],
            json!(1),
            "guests default to 1, never to 0"
        );
    }

    #[test]
    fn split_session_requires_the_source_session_and_an_id() {
        assert!(
            split_session_pure(input(json!({ "target_table_id": "mesa-8" }), 1)).is_err(),
            "without the source session there is nothing to split"
        );
        assert!(
            split_session_pure(input(json!({ "session_id": "s-a" }), 0)).is_err(),
            "without context.new_ids the guest cannot invent the new session id"
        );
    }

    // ── tables#55 · las tres guardas hablan en CÓDIGOS DE DOMINIO, no en sqlx ─────────
    //
    // Hasta ahora las tres guardas del módulo vivían SOLO en el SQL interno (escritura
    // condicional + assert sobre `tables__gate`, ADR-0020), y cuando saltaban quien abortaba la
    // transacción era el `CHECK (ok = 1)` de Postgres. El hostelero leía esto, tal cual, en un
    // banner rojo:
    //
    //     db: sqlx: error returned from database: new row for relation "tables__gate"
    //     violates check constraint "tables__gate_ok_check" at line 2076
    //
    // Y las TRES daban el mismo texto, así que ni la persona ni el código que llama podían
    // distinguir «esta zona tiene mesas» de «esa mesa tiene una cuenta abierta» de «esa mesa ya
    // está ocupada» de un fallo real de base de datos. El arreglo de tables#14 —traducir la
    // carrera de dos TPV por la misma mesa— estaba construido sobre un contrato que el backend no
    // cumplía: se keyea por código, y el código que llegaba era el genérico.
    //
    // `expect_rows` no alcanza aquí: es Tier 2, y la gate de filas afectadas no cuenta las
    // operaciones que devuelve un handler (tasks#26). La guarda va donde el handler puede verla:
    // sobre las filas que el runtime PRE-CARGA (`reads`, ADR-0069) — mismo patrón que kitchen#11.
    //
    // El SQL sigue guardando: es la red de la CARRERA (dos TPV a la vez), que ninguna lectura
    // previa puede cerrar. Lo que ya no hace es ser la única puerta.

    /// Entrada `{payload, context}` con las filas que el runtime pre-carga (`reads`).
    fn input_with_reads(payload: Value, ids: usize, reads: Value) -> Value {
        let mut v = input(payload, ids);
        v["context"]["reads"] = reads;
        v
    }

    fn domain_code(out: &Output) -> String {
        out.error
            .as_ref()
            .map(|e| e.code.clone())
            .unwrap_or_else(|| format!("<no error, {} operation(s)>", out.operations.len()))
    }

    #[test]
    fn borrar_una_zona_con_mesas_devuelve_su_codigo_no_la_constraint() {
        let out = delete_zone_pure(input_with_reads(
            json!({ "zone_id": "z-qa" }),
            0,
            json!({ "tables.zones.get": [{ "id": "z-qa", "name": "QA Zona", "table_count": 8 }] }),
        ))
        .expect("una guarda de negocio es un Output, no un trap del guest");

        assert_eq!(domain_code(&out), "tables.zone_has_tables");
        assert!(
            out.operations.is_empty(),
            "una zona con mesas no llega a tocar la BD"
        );
        assert!(
            !out.error.as_ref().unwrap().message.contains("sqlx"),
            "el mensaje es para una persona, no para el driver"
        );
    }

    #[test]
    fn borrar_una_zona_vacia_sigue_pasando() {
        let out = delete_zone_pure(input_with_reads(
            json!({ "zone_id": "z-vacia" }),
            0,
            json!({ "tables.zones.get": [{ "id": "z-vacia", "name": "Vacía", "table_count": 0 }] }),
        ))
        .expect("zona sin mesas");
        assert!(out.error.is_none(), "no hay nada que rechazar");
        assert_eq!(out.operations[0].command, "tables._zone_delete");
        assert_eq!(out.operations[0].params["zone_id"], json!("z-vacia"));
    }

    #[test]
    fn borrar_una_zona_que_no_existe_no_se_confunde_con_una_zona_con_mesas() {
        let out = delete_zone_pure(input_with_reads(
            json!({ "zone_id": "z-fantasma" }),
            0,
            json!({ "tables.zones.get": [] }),
        ))
        .expect("zona inexistente");
        assert_eq!(domain_code(&out), "tables.zone_not_found");
        assert!(out.operations.is_empty());
    }

    #[test]
    fn borrar_una_mesa_con_cuenta_abierta_devuelve_su_codigo() {
        let out = delete_table_pure(input_with_reads(
            json!({ "table_id": "t-9" }),
            0,
            json!({ "tables.tables.get": [
                { "id": "t-9", "number": "9", "status": "occupied", "is_active": 1, "active_session_count": 1 }
            ] }),
        ))
        .expect("mesa con cuenta abierta");
        assert_eq!(domain_code(&out), "tables.table_has_active_session");
        assert!(out.operations.is_empty());
    }

    #[test]
    fn borrar_una_mesa_libre_sigue_pasando() {
        let out = delete_table_pure(input_with_reads(
            json!({ "table_id": "t-9" }),
            0,
            json!({ "tables.tables.get": [
                { "id": "t-9", "number": "9", "status": "available", "is_active": 1, "active_session_count": 0 }
            ] }),
        ))
        .expect("mesa libre");
        assert!(out.error.is_none());
        assert_eq!(out.operations[0].command, "tables._table_delete");
    }

    #[test]
    fn borrar_una_mesa_que_no_existe_devuelve_not_found() {
        let out = delete_table_pure(input_with_reads(
            json!({ "table_id": "t-fantasma" }),
            0,
            json!({ "tables.tables.get": [] }),
        ))
        .expect("mesa inexistente");
        assert_eq!(domain_code(&out), "tables.table_not_found");
        assert!(out.operations.is_empty());
    }

    #[test]
    fn sentar_en_una_mesa_ocupada_devuelve_su_propio_codigo() {
        // Es la carrera de tables#14 vista desde el lado determinista: el TPV pide sentar en una
        // mesa que YA está ocupada. El camarero tiene que leer «otro dispositivo acaba de ocupar
        // esa mesa», y eso se keyea por ESTE código.
        for status in ["occupied", "blocked"] {
            let out = open_session_pure(input_with_reads(
                json!({ "table_id": "t-1", "guests_count": 2 }),
                1,
                json!({ "tables.tables.get": [
                    { "id": "t-1", "number": "1", "status": status, "is_active": 1, "active_session_count": 0 }
                ] }),
            ))
            .expect("mesa no sentable");
            assert_eq!(domain_code(&out), "tables.table_not_available", "status {status}");
            assert!(out.operations.is_empty(), "status {status}");
        }
    }

    #[test]
    fn una_mesa_desactivada_tampoco_se_sienta() {
        let out = open_session_pure(input_with_reads(
            json!({ "table_id": "t-1" }),
            1,
            json!({ "tables.tables.get": [
                { "id": "t-1", "number": "1", "status": "available", "is_active": 0, "active_session_count": 0 }
            ] }),
        ))
        .expect("mesa desactivada");
        assert_eq!(domain_code(&out), "tables.table_not_available");
    }

    #[test]
    fn una_mesa_reservada_si_se_sienta() {
        // tables#12: de eso va la reserva — llega Ana y la sientas. Exigir `available` aquí
        // convertiría el plano en un bloqueo peor que el defecto.
        for status in ["available", "reserved"] {
            let out = open_session_pure(input_with_reads(
                json!({ "table_id": "t-1", "guests_count": 2 }),
                1,
                json!({ "tables.tables.get": [
                    { "id": "t-1", "number": "1", "status": status, "is_active": 1, "active_session_count": 0 }
                ] }),
            ))
            .expect("mesa sentable");
            assert!(out.error.is_none(), "status {status}");
            assert_eq!(out.operations[0].command, "tables._session_open");
        }
    }

    #[test]
    fn sentar_en_una_mesa_que_no_existe_devuelve_not_found() {
        let out = open_session_pure(input_with_reads(
            json!({ "table_id": "t-fantasma" }),
            1,
            json!({ "tables.tables.get": [] }),
        ))
        .expect("mesa inexistente");
        assert_eq!(domain_code(&out), "tables.table_not_found");
        assert!(out.operations.is_empty());
    }

    #[test]
    fn sin_reads_el_handler_no_ADIVINA_y_deja_pasar_al_gate_sql() {
        // Un runtime que no pre-cargó la fila (manifest/runtime desincronizados) no puede
        // convertirse en un rechazo de negocio: se degrada al comportamiento de siempre y la
        // guarda del SQL sigue estando. Lo contrario —rechazar por falta de lectura— dejaría el
        // TPV sin poder sentar a nadie por un fallo de plomería.
        let out = open_session_pure(input(json!({ "table_id": "t-1" }), 1))
            .expect("sin reads");
        assert!(out.error.is_none());
        assert_eq!(out.operations[0].command, "tables._session_open");
    }

    // ── tables#124 · closing a table by hand never frees it with its bill still open ─────────

    fn session_row(status: &str, order_id: Value) -> Value {
        json!({ "id": "s-1", "table_id": "t-1", "status": status, "order_id": order_id })
    }

    #[test]
    fn closing_by_hand_with_the_bill_still_open_in_sales_is_refused() {
        let out = close_session_pure(input_with_reads(
            json!({ "session_id": "s-1", "order_id": "o-1" }),
            0,
            json!({
                "tables.sessions.get": [session_row("active", json!("o-1"))],
                "sales.order.get": [{ "id": "o-1", "status": "open" }],
            }),
        ))
        .expect("a business refusal is an Output");
        assert_eq!(domain_code(&out), "tables.session_bill_open");
        assert!(out.operations.is_empty(), "the table is not freed");
    }

    #[test]
    fn closing_by_hand_once_the_bill_is_no_longer_open_goes_through() {
        // Deleted in sales (`voided`), or already charged (`completed`): nothing left to charge.
        for status in ["voided", "completed"] {
            let out = close_session_pure(input_with_reads(
                json!({ "session_id": "s-1", "order_id": "o-1" }),
                0,
                json!({
                    "tables.sessions.get": [session_row("active", json!("o-1"))],
                    "sales.order.get": [{ "id": "o-1", "status": status }],
                }),
            ))
            .expect("closable");
            assert!(out.error.is_none(), "order {status}");
            assert_eq!(out.operations[0].command, "tables._session_close");
            assert_eq!(out.operations[0].params["order_id"], json!("o-1"), "order {status}");
        }
    }

    #[test]
    fn a_bill_that_no_longer_exists_in_sales_does_not_hold_the_table() {
        let out = close_session_pure(input_with_reads(
            json!({ "session_id": "s-1", "order_id": "o-1" }),
            0,
            json!({
                "tables.sessions.get": [session_row("active", json!("o-1"))],
                "sales.order.get": [],
            }),
        ))
        .expect("closable");
        assert!(out.error.is_none());
        assert_eq!(out.operations[0].command, "tables._session_close");
    }

    #[test]
    fn without_sales_installed_a_table_with_a_bill_still_closes() {
        // The graceful read is simply absent when sales is not installed: there is no till that
        // could charge that bill, so holding the table would only leave it dead.
        let out = close_session_pure(input_with_reads(
            json!({ "session_id": "s-1", "order_id": "o-1" }),
            0,
            json!({ "tables.sessions.get": [session_row("active", json!("o-1"))] }),
        ))
        .expect("closable");
        assert!(out.error.is_none());
        assert_eq!(out.operations[0].command, "tables._session_close");
    }

    #[test]
    fn a_caller_that_does_not_name_the_tables_bill_is_refused() {
        // The bill is checked by the `order_id` the caller names (reads take their params from
        // the payload): omitting it, or naming another one, must not slip past the guard.
        for payload in [
            json!({ "session_id": "s-1" }),
            json!({ "session_id": "s-1", "order_id": null }),
            json!({ "session_id": "s-1", "order_id": "o-other" }),
        ] {
            let out = close_session_pure(input_with_reads(
                payload.clone(),
                0,
                json!({
                    "tables.sessions.get": [session_row("active", json!("o-1"))],
                    "sales.order.get": [],
                }),
            ))
            .expect("refusal");
            assert_eq!(domain_code(&out), "tables.session_bill_mismatch", "{payload}");
            assert!(out.operations.is_empty(), "{payload}");
        }
    }

    #[test]
    fn a_check_without_a_bill_closes_as_always() {
        let out = close_session_pure(input_with_reads(
            json!({ "session_id": "s-1" }),
            0,
            json!({ "tables.sessions.get": [session_row("active", Value::Null)] }),
        ))
        .expect("closable");
        assert!(out.error.is_none());
        assert_eq!(out.operations[0].command, "tables._session_close");
        assert_eq!(out.operations[0].params["order_id"], Value::Null);
    }

    #[test]
    fn closing_a_check_that_is_not_open_says_so() {
        for rows in [json!([]), json!([session_row("closed", json!("o-1"))])] {
            let out = close_session_pure(input_with_reads(
                json!({ "session_id": "s-1", "order_id": "o-1" }),
                0,
                json!({ "tables.sessions.get": rows.clone() }),
            ))
            .expect("refusal");
            assert_eq!(domain_code(&out), "tables.session_not_active", "{rows}");
            assert!(out.operations.is_empty());
        }
    }

    #[test]
    fn ningun_codigo_del_modulo_se_sale_de_su_namespace() {
        // El host RECHAZA un código fuera del namespace del módulo (`valid_domain_code`,
        // hub#139) y lo convierte en un error de guest roto, no en un Domain que la UI traduce.
        // Un typo aquí no degrada un mensaje: rompe el command entero.
        let outs = [
            delete_zone_pure(input_with_reads(json!({ "zone_id": "z" }), 0, json!({ "tables.zones.get": [] }))),
            delete_table_pure(input_with_reads(json!({ "table_id": "t" }), 0, json!({ "tables.tables.get": [] }))),
            open_session_pure(input_with_reads(json!({ "table_id": "t" }), 1, json!({ "tables.tables.get": [] }))),
        ];
        for out in outs.into_iter().flatten() {
            if let Some(err) = out.error {
                assert!(
                    err.code.starts_with("tables."),
                    "`{}` está fuera del namespace del módulo",
                    err.code
                );
            }
        }
    }

    // ── tables#53 · el lote nace en una rejilla LEGIBLE, no en una pila ───────────────
    //
    // `bulk_create` repartía en `x = (i % 5) * 20`, `y = (i / 5) * 20` y persistía `width`/
    // `height` = 10. Esa rejilla es coherente CON SIGO MISMA —hueco de 10 entre cajas de 10—,
    // pero el plano no dibuja en esa unidad: pinta cajas de 72 px en las coordenadas crudas. Con
    // paso 20 y caja de 72 el solape es aritmético, no una casualidad: 56 px, el 74 % del ancho.
    // De las 12 mesas del Salón de la plantilla Restaurante se leían DOS números.
    //
    // El arreglo es que las dos mitades hablen la MISMA unidad: el generador emite píxeles reales
    // y persiste la caja que el plano va a pintar. El test no comprueba números mágicos, comprueba
    // la propiedad que importa —ninguna mesa tapa a otra— usando la caja que el propio lote
    // persiste, que es lo único que ata generador y lienzo.

    fn rects(out: &Output) -> Vec<(i64, i64, i64, i64)> {
        out.operations
            .iter()
            .map(|op| {
                let g = |k: &str| as_i64(&op.params[k]).unwrap_or(0);
                (g("position_x"), g("position_y"), g("width"), g("height"))
            })
            .collect()
    }

    fn overlap(a: (i64, i64, i64, i64), b: (i64, i64, i64, i64)) -> bool {
        a.0 < b.0 + b.2 && b.0 < a.0 + a.2 && a.1 < b.1 + b.3 && b.1 < a.1 + a.3
    }

    #[test]
    fn bulk_create_no_apila_ni_una_mesa_sobre_otra() {
        // Los 8 del caso de la issue, y el lote entero, que es donde una rejilla mal escalada se
        // nota más (12 del Salón, 8 de la Terraza, 6 de la Barra…).
        for count in [1_i64, 2, 5, 6, 8, 12, 26, 100] {
            let out = bulk_create_tables_pure(input(
                json!({ "zone_id": "z1", "count": count, "prefix": "Q", "start_number": 1 }),
                count as usize,
            ))
            .unwrap_or_else(|e| panic!("lote de {count}: {e}"));

            let r = rects(&out);
            assert_eq!(r.len(), count as usize);
            for (i, a) in r.iter().enumerate() {
                assert!(
                    a.2 >= MIN_BOX && a.3 >= MIN_BOX,
                    "la caja que se persiste tiene que ser la que el plano pinta: {a:?}"
                );
                for b in r.iter().skip(i + 1) {
                    assert!(!overlap(*a, *b), "lote de {count}: {a:?} tapa a {b:?}");
                }
            }
        }
    }

    #[test]
    fn bulk_create_deja_hueco_entre_mesas_no_solo_las_pega() {
        // Pegadas tampoco vale: sin hueco el plano es una cuadrícula sólida y no se distingue una
        // mesa de la de al lado, que es lo que el encargado tiene que leer de un vistazo.
        let out = bulk_create_tables_pure(input(
            json!({ "zone_id": "z1", "count": 6, "prefix": "Q", "start_number": 1 }),
            6,
        ))
        .expect("lote de 6");
        let r = rects(&out);
        assert!(r[0].0 > 0 && r[0].1 > 0, "la primera mesa no se pega al borde: {:?}", r[0]);
        let step_x = r[1].0 - r[0].0;
        assert!(
            step_x >= r[0].2 + 8,
            "el paso ({step_x}) tiene que dejar hueco sobre la caja ({})",
            r[0].2
        );
    }
}
