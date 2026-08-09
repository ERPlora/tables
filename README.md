# Módulo `tables` — plano de sala, mesas y sesiones

Plano de sala de un restaurante: **zonas**, **mesas** físicas (con su posición en el lienzo) y
**sesiones** de servicio — una sesión es **una CUENTA**. Cubre todo lo que le pasa a una cuenta en
sala: abrir, aparcar, transferir, fusionar, **dividir** y cerrar, más la **retención** de mesa para
una reserva. Es la **autoridad de ocupación** del hub.

> **Module id:** `tables`. **Depende de:** nada (`depends_on: []`) — todo lo que sale del módulo es
> referencia opaca o evento. Módulo híbrido: SQL + handler WASM (9 funciones) con guardas de estado
> en SQL vía tabla guardia `tables__gate` (patrón ADR-0020).

## Documentación de usuario — [`docs/`](docs/)

Viaja **dentro** del módulo y se versiona con él: el asistente del hub (ADR-0282) la indexa por
versión instalada y cita la de TU versión, no la de la última publicada. En inglés (idioma fuente).

| Fichero | Para qué |
| ------- | -------- |
| [`docs/overview.md`](docs/overview.md) | Qué hace y qué NO hace; el vocabulario (estados de mesa/sesión/retención) |
| [`docs/screens.md`](docs/screens.md) | Floor Plan / Zones / Tables / Sessions y el flujo de sala paso a paso |
| [`docs/concepts.md`](docs/concepts.md) | Sesión ≠ mesa ≠ reserva, **un pedido lo posee UNA sesión**, aparcar ≠ cerrar, cobro parcial NO libera, el aforo AVISA (no bloquea) |
| [`docs/limits.md`](docs/limits.md) | Rechazos reales (`not_available`, `tables_attached`, `active_sessions`), permisos y diagnóstico |

## Qué expone hoy

| Tipo | Nombre | Permiso |
| ---- | ------ | ------- |
| query | `tables.zones.list` / `.get` | `view_zone` |
| query | `tables.tables.list` (arrastra la retención viva) | `view_table` |
| query | `tables.sessions.list` / `.by_order` | `view_tablesession` |
| command | `tables.zones.create` / `.update` / `.delete` (WASM) | `add_/change_/delete_zone` |
| command | `tables.tables.create` / `.update` / `.move` / `.bulk_create` (WASM) / `.delete` (WASM) | `add_/change_/delete_table` |
| command | `tables.sessions.open` (WASM) / `.link_order` | `add_tablesession` |
| command | `tables.sessions.close` / `.transfer` / `.merge` / `.split` (WASM) · `.park` / `.restore` | `change_tablesession` |
| command | `tables.tables.hold` / `.release_hold` / `.expire_holds` | `change_tablesession` |
| escucha | `order.completed` · `sale.voided` → `_session_close_by_order` | — |
| tarea | `expire_table_holds` — `*/15 * * * *` (un no-show no mata la mesa) | — |
| slot | `sales.pos.assign` → `erp-tables-pos-zones` (prioridad 100) | `view_table` |

Navegación: `erp-tables-canvas` («Floor Plan») y `erp-tables-floor-plan` (Zones / Tables / Sessions /
Settings).

## Layout

```text
module.json                   # manifest (contrato técnico)
migrations/postgres/          # esquema §2.5 + tabla guardia tables__gate
queries/*.sql                 # lecturas declarativas (:hub_id inyectado)
commands/*.sql                # escrituras declarativas (las `_` son intenciones del WASM)
schemas/*.json                # JSON Schemas de input (draft 2020-12)
handler/                      # WASM Tier 2 → dist/handler.wasm
ui/                           # Web Components (Lit/Ionic/OutfitKit)
docs/                         # documentación de usuario + corpus del asistente
```

## Estado y trabajo abierto

El estado vive en las **Issues de este repo**, no aquí. El flujo dividir/juntar está cerrado de punta
a punta (tables#12 + sales#61 + tables#26). Pendiente conocido: `is_active=false` sobre una mesa no
`available` no está gateado (requeriría enrutar `tables.tables.update` a WASM).

Doc de arquitectura: `architecture/modules/tables.md` (cargarlo antes de tocar el módulo).
