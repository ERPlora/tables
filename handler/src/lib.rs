//! Handlers WASM (Tier 2) del módulo `tables` — WASM-TODO.md.
//!
//! Siete funciones exportadas (lógica pura, sin BD: reciben `{payload, context}`
//! y devuelven **intenciones** — ops SQL por nombre de command del mismo módulo —
//! que el host valida y ejecuta en UNA transacción):
//!
//! * `bulk_create_tables` — alta en lote: itera `count` veces, calcula
//!   `number = {prefix}{start_number + i}` y reparte la posición en rejilla
//!   (`x = (i % 5) * 20`, `y = (i / 5) * 20`). N intenciones de
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

use erplora_guest_sdk::{Operation, Output};
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
    bulk_create_tables_pure(input.into_inner().into_value()).map(Json).map_err(guest_err)
}

#[cfg(feature = "guest")]
#[plugin_fn]
pub fn open_session(input: Json<erplora_guest_sdk::Input>) -> FnResult<Json<Output>> {
    open_session_pure(input.into_inner().into_value()).map(Json).map_err(guest_err)
}

#[cfg(feature = "guest")]
#[plugin_fn]
pub fn close_session(input: Json<erplora_guest_sdk::Input>) -> FnResult<Json<Output>> {
    close_session_pure(input.into_inner().into_value()).map(Json).map_err(guest_err)
}

#[cfg(feature = "guest")]
#[plugin_fn]
pub fn transfer_session(input: Json<erplora_guest_sdk::Input>) -> FnResult<Json<Output>> {
    transfer_session_pure(input.into_inner().into_value()).map(Json).map_err(guest_err)
}

#[cfg(feature = "guest")]
#[plugin_fn]
pub fn merge_session(input: Json<erplora_guest_sdk::Input>) -> FnResult<Json<Output>> {
    merge_session_pure(input.into_inner().into_value()).map(Json).map_err(guest_err)
}

#[cfg(feature = "guest")]
#[plugin_fn]
pub fn split_session(input: Json<erplora_guest_sdk::Input>) -> FnResult<Json<Output>> {
    split_session_pure(input.into_inner().into_value()).map(Json).map_err(guest_err)
}

#[cfg(feature = "guest")]
#[plugin_fn]
pub fn delete_zone(input: Json<erplora_guest_sdk::Input>) -> FnResult<Json<Output>> {
    delete_zone_pure(input.into_inner().into_value()).map(Json).map_err(guest_err)
}

#[cfg(feature = "guest")]
#[plugin_fn]
pub fn delete_table(input: Json<erplora_guest_sdk::Input>) -> FnResult<Json<Output>> {
    delete_table_pure(input.into_inner().into_value()).map(Json).map_err(guest_err)
}

#[cfg(feature = "guest")]
#[plugin_fn]
pub fn delete_session(input: Json<erplora_guest_sdk::Input>) -> FnResult<Json<Output>> {
    delete_session_pure(input.into_inner().into_value()).map(Json).map_err(guest_err)
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
        if s.is_empty() { "square".to_string() } else { s }
    };
    if !matches!(shape.as_str(), "square" | "round" | "rectangle") {
        return Err(format!("`shape` inválido: `{shape}` (square|round|rectangle)"));
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
        p.insert("number".into(), json!(format!("{prefix}{}", start_number + i)));
        p.insert("name".into(), json!(""));
        p.insert("capacity".into(), json!(capacity));
        p.insert("position_x".into(), json!((i % 5) * 20));
        p.insert("position_y".into(), json!((i / 5) * 20));
        p.insert("width".into(), json!(10));
        p.insert("height".into(), json!(10));
        p.insert("shape".into(), json!(shape));
        ops.push(Operation::sql("tables._insert_table", p));
    }

    // El evento `tables.table.created` lo emite el command (declarado en module.json).
    Ok(Output { operations: ops, events: vec![] })
}

// ── sesiones ─────────────────────────────────────────────────────────────────

/// `{payload, context}` → intención `tables._session_open`.
pub fn open_session_pure(input: Value) -> Result<Output, String> {
    let (payload, new_ids) = payload_and_ids(&input);

    let table_id = req_str(&payload, "table_id")?;
    let guests_count = match payload.get("guests_count") {
        None | Some(Value::Null) => 1,
        Some(v) => as_i64(v).filter(|n| *n >= 1).ok_or("`guests_count` debe ser un entero >= 1")?,
    };
    let session_id = new_ids
        .first()
        .map(as_str)
        .filter(|s| !s.is_empty())
        .ok_or("context.new_ids vacío: el host no entregó ids")?;

    let mut p = Map::new();
    p.insert("session_id".into(), json!(session_id));
    p.insert("table_id".into(), json!(table_id));
    p.insert("guests_count".into(), json!(guests_count));
    p.insert("waiter_id".into(), opt_str(&payload, "waiter_id"));
    p.insert("notes".into(), json!(as_str(payload.get("notes").unwrap_or(&Value::Null))));
    // ADR-0141: la sesión es la JUNCTION mesa↔pedido. `order_id` (opcional) enlaza esta mesa con el
    // pedido abierto de `sales`. `tables` OWNea la asociación; `sales` no conoce la mesa.
    p.insert("order_id".into(), opt_str(&payload, "order_id"));

    // El evento `tables.session.opened` lo emite el command (declarado).
    Ok(Output { operations: vec![Operation::sql("tables._session_open", p)], events: vec![] })
}

/// `{payload, context}` → intención `tables._session_close`.
pub fn close_session_pure(input: Value) -> Result<Output, String> {
    let (payload, _) = payload_and_ids(&input);

    let session_id = req_str(&payload, "session_id")?;
    let mut p = Map::new();
    p.insert("session_id".into(), json!(session_id));
    p.insert("notes".into(), opt_str(&payload, "notes"));

    Ok(Output { operations: vec![Operation::sql("tables._session_close", p)], events: vec![] })
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

    Ok(Output { operations: vec![Operation::sql("tables._session_transfer", p)], events: vec![] })
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

    Ok(Output { operations: vec![Operation::sql("tables._session_merge", p)], events: vec![] })
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
        Some(v) => as_i64(v).filter(|n| *n >= 1).ok_or("`guests_count` debe ser un entero >= 1")?,
    };

    let mut p = Map::new();
    p.insert("session_id".into(), json!(session_id));
    p.insert("new_session_id".into(), json!(new_session_id));
    p.insert("target_table_id".into(), opt_str(&payload, "target_table_id"));
    p.insert("guests_count".into(), json!(guests_count));
    p.insert("notes".into(), json!(as_str(payload.get("notes").unwrap_or(&Value::Null))));

    Ok(Output { operations: vec![Operation::sql("tables._session_split", p)], events: vec![] })
}

/// `{payload, context}` → intención `tables._session_delete`.
pub fn delete_session_pure(input: Value) -> Result<Output, String> {
    let (payload, _) = payload_and_ids(&input);
    let session_id = req_str(&payload, "session_id")?;
    let mut p = Map::new();
    p.insert("session_id".into(), json!(session_id));
    Ok(Output { operations: vec![Operation::sql("tables._session_delete", p)], events: vec![] })
}

// ── borrados con guarda (zona / mesa) ────────────────────────────────────────

/// `{payload, context}` → intención `tables._zone_delete`.
pub fn delete_zone_pure(input: Value) -> Result<Output, String> {
    let (payload, _) = payload_and_ids(&input);
    let zone_id = req_str(&payload, "zone_id")?;
    let mut p = Map::new();
    p.insert("zone_id".into(), json!(zone_id));
    Ok(Output { operations: vec![Operation::sql("tables._zone_delete", p)], events: vec![] })
}

/// `{payload, context}` → intención `tables._table_delete`.
pub fn delete_table_pure(input: Value) -> Result<Output, String> {
    let (payload, _) = payload_and_ids(&input);
    let table_id = req_str(&payload, "table_id")?;
    let mut p = Map::new();
    p.insert("table_id".into(), json!(table_id));
    Ok(Output { operations: vec![Operation::sql("tables._table_delete", p)], events: vec![] })
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
        assert!(out.events.is_empty(), "el evento lo emite el command (declarado en module.json)");
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
            json!({ "table_id": "mesa-5", "order_id": "ord-9" }), 1,
        )).expect("open con table_id + order_id");
        let op = &out.operations[0];
        assert_eq!(op.command, "tables._session_open");
        assert_eq!(op.params["order_id"], json!("ord-9"), "el order_id viaja a la junction");
        assert_eq!(op.params["table_id"], json!("mesa-5"));

        // sin order_id (mesa ocupada antes de crear el pedido) → NULL, sigue funcionando.
        let out2 = open_session_pure(input(json!({ "table_id": "mesa-5" }), 1)).expect("open sin order_id");
        assert!(out2.operations[0].params["order_id"].is_null(), "order_id es opcional → NULL");
    }

    // ── split_session (dividir la cuenta, tables#12) ─────────────────────────

    #[test]
    fn split_session_opens_a_second_check_on_the_same_table_by_default() {
        // Splitting a check is what a party asks for when they want separate bills. `tables`
        // owns the SEATING side of it: a second live session on the same table, pointing back
        // at the one it came from. The lines/amounts belong to `sales`, which links its new
        // order to the new session afterwards.
        let out = split_session_pure(input(
            json!({ "session_id": "s-a", "guests_count": 2 }),
            1,
        ))
        .expect("split with only the source session");

        assert_eq!(out.operations.len(), 1, "one intention: the split");
        let op = &out.operations[0];
        assert_eq!(op.command, "tables._session_split");
        assert_eq!(op.params["session_id"], json!("s-a"));
        assert_eq!(op.params["new_session_id"], json!("id-0"), "the host owns the ids");
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
}
