import { LitElement, html, css, nothing } from 'lit';
import { state } from 'lit/decorators.js';
import { define } from '@erplora/outfitkit/define';
import '@erplora/outfitkit/ok-inline-feedback';
import '@erplora/outfitkit/ok-empty-state';
// Catálogo i18n del módulo (ADR-0055): esbuild inlinea estos JSON en el `dist` del WC. Los textos
// internos se resuelven con `erplora.t(CATALOG, 'ui.clave')` (idioma activo, fallback locale→en→clave).
import esLocale from '../../../locales/es.json';
import enLocale from '../../../locales/en.json';
import { domainMessage } from '../../lib/domain-error';
import { sortNaturallyBy } from '../../lib/natural-order';
const CATALOG: Record<string, unknown> = { es: esLocale, en: enLocale };

// erp-tables-canvas — editor visual del PLANO DE SALA (la "estructura de la terraza"). Pantalla
// completa del módulo `tables` (entrada de navegación `floor_plan`). Pinta las mesas como cajas
// posicionadas sobre un lienzo, con pestañas por ZONA. Permite:
//   · crear zona / crear mesa,
//   · ARRASTRAR una mesa para recolocarla (persiste con `tables.tables.move`),
//   · CLIC en una mesa para editarla (número/nombre/aforo/forma/estado) o borrarla,
//   · renombrar / borrar la zona activa.
// Distingue clic de arrastre por el desplazamiento del puntero. Tier 0 puro: toda la lógica vive en
// commands declarativos; el WC solo orquesta UI + drag. Lee el cliente de `globalThis.erplora`.

interface Zone { id: string; name: string; color?: string; sort_order?: number; is_active?: number; description?: string; }
interface Table {
  id: string; number: string; name: string; capacity: number; shape: string; status: string;
  is_active: number; zone_id: string | null; position_x: number; position_y: number; width: number; height: number;
  // tables#12: la retención viva de la mesa, servida por `tables.tables.list`. La leyenda
  // «Reservada» existía desde el principio pero nunca se alcanzaba porque nadie escribía el estado;
  // ahora que se pinta, el plano dice además DE QUIÉN es y a qué hora.
  reserved_for?: string | null;
  reserved_from?: string | null;
  reserved_until?: string | null;
  reserved_party_size?: number | null;
  // tables#32 / tables#64 / tables#74: the LIVE check of the table, served by `tables.tables.list`.
  // Covers seated, when it sat down, and WHO is serving it — the three things a floor manager reads
  // off an occupied table. `live_waiter_id` is an opaque id (ADR-0192): the name is resolved here
  // against `hub.users.list`, never joined in SQL.
  live_guests?: number | null;
  live_waiter_id?: string | null;
  live_since?: string | null;
}

/** One row of `hub.users.list` — the hub's people (ADR-0192, the core's reserved namespace).
 *  Personnel belongs to the CORE, not to the `staff` module: the same door the KDS card
 *  (kitchen#63) and the printed chit already use to put a name on a `waiter_id`. */
interface HubUser {
  id: string;
  name: string;
}

/** `2026-08-07T21:00:00+00:00` → `21:00`, en la hora del dispositivo: la sala mira el reloj de
 *  pared, y una fecha ISO entera no cabe sobre una mesa del plano. */
function hhmm(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Whole minutes from `iso` to `now`, or `null` when there is no usable timestamp. */
export function minutesSince(iso: string | null | undefined, now: Date): number | null {
  if (!iso) return null;
  const from = new Date(iso).getTime();
  if (Number.isNaN(from)) return null;
  return Math.max(0, Math.floor((now.getTime() - from) / 60_000));
}

interface ErploraLike {
  query<T = unknown>(name: string, params?: Record<string, unknown>): Promise<T>;
  /** TODAS las filas (sin tope). Para lo que no es «una página»: la rejilla del TPV, un
   *  `<ion-select>` de categorías… El viejo `page_size` NO existía y truncaba a 50. */
  queryAll<T = unknown>(name: string, params?: Record<string, unknown>): Promise<T[]>;
  command<T = unknown>(name: string, payload?: Record<string, unknown>): Promise<T>;
  on?(event: string, cb: (payload: unknown) => void): () => void;
  /** i18n del módulo (ADR-0055): idioma activo + traducción del catálogo `ui`. */
  locale: string;
  t(catalog: Record<string, unknown>, key: string, params?: Record<string, unknown>): string;
}

const BOX = 72; // tamaño de la caja de mesa en px (se persiste como width/height)
const DRAG_THRESHOLD = 5; // px: por debajo se considera CLIC (editar), por encima ARRASTRE (mover)
const KEY_STEP = 8; // px moved per arrow key press (Shift = 4×) — tables#16
const SHAPES = ['square', 'round', 'rectangle'];
const STATUSES = ['available', 'occupied', 'reserved', 'blocked'];
// enum → clave i18n (el `value=` del enum NO se traduce; sí su etiqueta visible).
const STATUS_KEY: Record<string, string> = {
  available: 'ui.statusAvailable', occupied: 'ui.statusOccupied', reserved: 'ui.statusReserved', blocked: 'ui.statusBlocked',
};
const SHAPE_KEY: Record<string, string> = { square: 'ui.shapeSquare', round: 'ui.shapeRound', rectangle: 'ui.shapeRectangle' };
const STATUS_COLOR: Record<string, string> = {
  available: '#2f9e44', occupied: '#d9480f', reserved: '#f08c00', blocked: '#868e96',
};
// tables#64 — the status may NOT live in the colour alone. Roughly 8 % of men are colour-blind and
// a 2 px border says nothing across a room, so every tile carries the three encodings the market
// uses (Square and Toast both label the state, and our own POS «choose table» modal already writes
// DISPONIBLE): the colour, the written label, and an icon that is different for each state.
// Shape: the icon travels under an `icon` property, which is how the toolkit bakes an icon passed
// as DATA into `dist/icons.json` (the same convention `ok-data-table` actions use). Written as a
// bare `Record<string, string>` the baker only sees the fallback literal of the binding, and the
// four status icons ship BLANK — which is the whole defect this fixes, arriving through the back
// door. `erplora build` prints the icon count, and `dist/icons.json` is committed: both show it.
const STATUS_ICON: Record<string, { icon: string }> = {
  available: { icon: 'checkmark-circle-outline' },
  occupied: { icon: 'people-outline' },
  reserved: { icon: 'time-outline' },
  blocked: { icon: 'ban-outline' },
};
/** How often the «seated for N min» of an occupied table is refreshed while the plan is open. */
const REFRESH_MS = 30_000;

function erplora(): ErploraLike {
  const c = (globalThis as { erplora?: ErploraLike }).erplora;
  if (!c) throw new Error('erplora SDK no inicializado por el shell');
  return c;
}

function rows<T>(r: unknown): T[] {
  if (Array.isArray(r)) return r as T[];
  if (r && typeof r === 'object' && Array.isArray((r as { rows?: T[] }).rows)) return (r as { rows: T[] }).rows;
  return [];
}

// #271 — las mesas de un blueprint/seed llegan SIN posición (0,0) y colapsaban en la esquina
// superior izquierda, apiladas. Las creadas a mano (`addTable`) sí calculaban un offset en cascada;
// las importadas no. Esto reparte en un grid las mesas que quedarían tapadas, para que el plano se
// vea usable nada más cargar. El usuario luego las arrastra y persiste la posición final con
// `tables.tables.move`.
//
// tables#53 — «solo las que están en (0,0)» tapaba UNA de las dos puertas. La otra es la que usa
// el propio módulo: `bulk_create` repartía en una rejilla de paso 20 con cajas de 10 y el lienzo
// pintaba cajas fijas de 72 px en esas coordenadas crudas — 56 px de solape, el 74 % del ancho, y
// de las 12 mesas del Salón se leían dos números. (20,0) y (40,0) le parecían «coordenadas
// reales» al centinela de entonces (`!position_x && !position_y`), así que se pintaban verbatim,
// una encima de otra.
//
// tables#57 — y la condición definitiva no es la coordenada ni el solape, sino **¿alguien colocó
// esta mesa alguna vez?**, que responde su CAJA (ver `neverPlaced`). Eso cubre el (0,0) del seed y
// el paso-20 del lote —ambos traen la unidad vieja de 10 px— sin reservar (0,0) como centinela, y
// arregla los hubs que YA tienen esas coordenadas guardadas sin pedir una migración. El generador
// emite píxeles reales desde tables#53 (`handler/src/lib.rs`), así que en un hub nuevo esta red no
// llega a activarse: se comprueba en `erp-tables-canvas.test.ts`.
const AUTO_GAP = 16;       // px de margen entre celdas
const AUTO_CELL = BOX + AUTO_GAP; // paso del grid (una mesa por celda)
const AUTO_COLS = 4;       // nº de columnas del grid de fallback
// Por debajo de esto un `width`/`height` no es una caja que alguien eligiera: es el residuo de la
// unidad vieja (10, cuando la rejilla se contaba en celdas y no en px). Ni se pinta ni se respeta
// — se usa `BOX`. Mismo umbral que `MIN_BOX` en `handler/src/lib.rs`.
const MIN_BOX = 24;

/** La caja que esta mesa PINTA: la suya si es una caja real, la de por defecto si no (tables#53). */
function boxOf(t: Pick<Table, 'width' | 'height'>): { w: number; h: number } {
  const w = Number(t.width) || 0;
  const h = Number(t.height) || 0;
  return { w: w >= MIN_BOX ? w : BOX, h: h >= MIN_BOX ? h : BOX };
}

/**
 * tables#57 — `true` when NOBODY has ever placed this table, so the plan may lay it out itself.
 *
 * The old answer was the COORDINATE: `!position_x && !position_y`. That made (0,0) a sentinel, and
 * (0,0) is also the corner of the canvas — a legitimate spot a floor plan must be able to use, and
 * one Toast, Square and Lightspeed all allow. Dragging a table there saved fine
 * (`tables.tables.move` → `ok`) and the plan moved it back on reload, which reads as «the floor
 * plan does not save» and is expensive to diagnose.
 *
 * The answer is the BOX, not the coordinate. Every writer that positions a table persists a real
 * box: `tables.tables.move` and the canvas «add table» send `BOX`, and `bulk_create` has done the
 * same since tables#53. A row that never went through one of them still carries the old unit —
 * `width`/`height` of 10, or 0 from a blueprint — which `MIN_BOX` already treats as «not a box
 * anybody chose», here and in `handler/src/lib.rs`. So the box answers «has anybody placed this?»
 * per row, for free, with no migration and with no coordinate reserved as a sentinel.
 *
 * What this drops on purpose: the previous rule ALSO re-laid a table that overlapped another one,
 * even with real boxes. That net was there for the legacy step-20 data of tables#53 — which always
 * carries the old 10 px box, so it is still caught — and it is what made (0,0) unreachable next to
 * a neighbour at (16,16). Two tables the host deliberately dragged together now stay where he left
 * them: arranging the room is his job, not the plan's.
 */
function neverPlaced(t: Pick<Table, 'width' | 'height'>): boolean {
  return !(Number(t.width) >= MIN_BOX && Number(t.height) >= MIN_BOX);
}

/** ¿Se tapan estas dos mesas, con la caja que cada una pinta? */
function seTapan(a: Table, b: Table): boolean {
  const ca = boxOf(a);
  const cb = boxOf(b);
  return (
    a.position_x < b.position_x + cb.w && b.position_x < a.position_x + ca.w &&
    a.position_y < b.position_y + cb.h && b.position_y < a.position_y + ca.h
  );
}

/**
 * Reparte sobre un grid las mesas que quedarían tapadas, respetando las que ya están bien puestas.
 * Se resuelve POR ZONA: cada zona es un plano propio y dos mesas de salas distintas nunca se ven
 * juntas, así que compartir hueco entre zonas no es un solape.
 */
function autoLayoutTables(tables: Table[]): Table[] {
  const byZone = new Map<string, Table[]>();
  for (const t of tables) {
    const key = t.zone_id ?? '';
    const bucket = byZone.get(key);
    if (bucket) bucket.push(t);
    else byZone.set(key, [t]);
  }
  const fixed = new Map<string, Table>();
  for (const zoneTables of byZone.values()) {
    // Las que se quedan donde están: alguien las colocó (tables#57 — su caja lo dice).
    const placed: Table[] = [];
    const pending: Table[] = [];
    for (const t of zoneTables) {
      if (neverPlaced(t)) pending.push(t);
      else placed.push(t);
    }
    // Y las demás, a la primera celda libre del grid — con una caja legible, porque una posición
    // nueva con el tamaño viejo seguiría siendo ilegible.
    let col = 0;
    let row = 0;
    for (const t of pending) {
      let candidate: Table;
      for (;;) {
        candidate = { ...t, position_x: AUTO_GAP + col * AUTO_CELL, position_y: AUTO_GAP + row * AUTO_CELL, width: BOX, height: BOX };
        col++;
        if (col >= AUTO_COLS) { col = 0; row++; }
        if (!placed.some((p) => seTapan(p, candidate))) break;
      }
      placed.push(candidate);
      fixed.set(candidate.id, candidate);
    }
  }
  // Se devuelve en el orden de entrada: el plano no reordena, solo recoloca lo que se tapaba.
  return tables.map((t) => fixed.get(t.id) ?? t);
}

export class ErpTablesCanvas extends LitElement {
  static styles = css`
    :host { display:block; font-family: system-ui, sans-serif; color: var(--ion-text-color,#1c1b18); }
    /* tables#16: every own control is a touch target (44px), like the ok-data-table actions. */
    ion-button { min-height:44px; --min-height:44px; }
    /* tables#64: la ÚNICA fila de cabecera — navegación (zonas) + las dos acciones de
       configuración, en iconos. A 390 px el plano empieza justo debajo. */
    .zonebar { display:flex; gap:.25rem; align-items:center; margin-bottom:.4rem; }
    .zonebar ion-segment { flex:1; min-width:0; }
    .zonebar .flex { flex:1; }
    .canvas { position:relative; height:60vh; min-height:22rem; border:1px dashed var(--ion-border-color,#cfcabd); border-radius: var(--ok-radius, 14px); background:
        repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(0,0,0,.04) 40px),
        repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(0,0,0,.04) 40px);
      overflow:hidden; touch-action:none; }
    /* tables#53: el TAMAÑO ya no se clava aquí — lo pinta cada mesa con el suyo (estilo inline),
       porque la fila lo trae y tables.tables.move lo persiste. Se deja como respaldo para una
       mesa que no lo declare. */
    .mesa { position:absolute; width:${BOX}px; height:${BOX}px; border:2px solid; border-radius: var(--ok-radius, 12px);
      display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:grab;
      background:var(--ion-background-color,#fff); user-select:none; box-shadow:0 1px 4px rgba(0,0,0,.12); }
    .mesa.round { border-radius: var(--ok-radius-pill, 50%); }
    .mesa.dragging { cursor:grabbing; opacity:.85; box-shadow:0 6px 18px rgba(0,0,0,.28); z-index:5; }
    /* Keyboard focus is visible: the table is a button (tables#16). */
    .mesa:focus-visible { outline:3px solid var(--ion-color-primary,#0091ce); outline-offset:2px; }
    /* La baldosa por defecto son 72 px: cada línea se acota al ancho o se corta a media palabra
       (medido en navegador a 390 px). Nada de text-transform:uppercase en el estado — ensancha
       ~15 % y «DISPONIBLE» dejaba de caber. */
    .mesa { padding:.1rem .15rem; overflow:hidden; line-height:1.12; text-align:center; }
    .mesa > * { max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .mesa .n { font-weight:700; font-size:1rem; }
    .mesa .c { font-size:.56rem; color:#8b897f; }
    /* tables#74: quién atiende la mesa ocupada. Nombre, nunca el id. */
    .mesa .w { font-size:.56rem; font-weight:600; }
    /* tables#64: el estado ESCRITO + su icono. El color se conserva, pero ya no está solo. */
    .mesa .s { display:inline-flex; align-items:center; justify-content:center; gap:.12rem;
      font-size:.55rem; font-weight:700; }
    .mesa .s ion-icon { font-size:.7rem; flex:none; }
    /* Nombre y hora de la reserva. Es lo que convierte el color ambar en informacion util:
       sin esto el encargado ve «reservada» y no sabe si le da tiempo a sentar a alguien. */
    .mesa .hold { font-size:.62rem; color:var(--ion-color-warning,#f08c00); font-weight:600;
      max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .hint { color:#8b897f; font-size:.85rem; margin:.5rem 0 0; }
    .err { color:#d9480f; font-weight:600; }
    .empty { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:#8b897f; text-align:center; padding:1rem; }
    /* Sheet de edición (en el shadow → conserva estilos) */
    .scrim { position:fixed; inset:0; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; z-index:60; }
    .sheet { background:var(--ion-background-color,#fff); border-radius: var(--ok-radius-lg, 16px); padding:1rem; width:min(94vw,26rem); max-height:90vh; overflow:auto; box-shadow:0 12px 48px rgba(0,0,0,.35); }
    .sheet-h { display:flex; justify-content:space-between; align-items:center; margin-bottom:.8rem; }
    .sheet-h .t { font-size:1.2rem; font-weight:700; }
    .sheet-h ion-button.x { --color:#8b897f; margin:0; }
    .field { display:flex; flex-direction:column; gap:.25rem; margin-bottom:.7rem; min-width:0; }
    /* tables#84: NO vertical basis here. A .field is a COLUMN flex box, so a flex-basis on its
       control is its HEIGHT — the old "flex:1 1 11rem" (written for a row of fields that no longer
       exists) handed every field 176 px for a ~56 px control, and that is the 100+ px of blank the
       floor manager read as a broken screen. A control is as tall as its content, no more. */
    .field ion-input, .field ion-select { width:100%; }
    .row2 { display:grid; grid-template-columns:1fr 1fr; gap:.7rem; }
    .sheet-foot { display:flex; justify-content:space-between; gap:.5rem; margin-top:1rem; }
    /* tables#83: each action of the «Add» sheet owns its field, so no control can promise
       something another button will discard. */
    .add-block + .add-block { margin-top:.9rem; padding-top:.9rem; border-top:1px solid var(--ion-border-color,#cfcabd); }
    .add-act { display:flex; justify-content:flex-end; }
  `;

  @state() private zones: Zone[] = [];
  @state() private tables: Table[] = [];
  @state() private activeZone = '';
  @state() private newZoneName = '';
  /** tables#83 — what the «Add» sheet will call the new table. Empty = the running number. */
  @state() private newTableNumber = '';
  @state() private error = '';
  @state() private loading = true;
  // Mesa en edición (copia editable; null = sheet cerrado). zoneEdit = sheet de zona.
  @state() private edit?: Table;
  @state() private zoneEdit?: Zone;
  @state() private saving = false;
  // tables#64: «Añadir zona» y «Añadir mesa» son configuración, no servicio — viven detrás de un
  // solo «+», como Square esconde la edición del plano tras «Edit».
  @state() private addOpen = false;
  /** id → nombre de las personas del hub (`hub.users.list`, ADR-0192). */
  @state() private waitersById = new Map<string, string>();

  /** Reloj inyectable (los tests lo clavan): lo lee el «lleva N min sentada». */
  now: () => Date = () => new Date();

  private unsub?: () => void;
  private timer?: ReturnType<typeof setInterval>;
  private dragId?: string;
  private dragDX = 0;
  private dragDY = 0;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragMoved = false;

  // Re-render al cambiar el idioma del shell (ADR-0055): los textos del template (legend, sheets,
  // tooltips…) se re-evalúan con el nuevo `erplora.locale`.
  private readonly onLocaleChange = (): void => this.requestUpdate();

  async connectedCallback() {
    super.connectedCallback();
    window.addEventListener('erplora:locale-changed', this.onLocaleChange);
    await this.reload();
    try {
      // Una suscripción por evento, con su literal EN la llamada (ADR-0127: el extractor
      // de contratos no sigue arrays; el nombre vive donde se usa).
      const offs = [
        erplora().on?.('tables.table.created', () => this.reload()),
        erplora().on?.('tables.table.updated', () => this.reload()),
        erplora().on?.('tables.table.deleted', () => this.reload()),
        erplora().on?.('tables.zone.created', () => this.reload()),
        erplora().on?.('tables.zone.updated', () => this.reload()),
        erplora().on?.('tables.zone.deleted', () => this.reload()),
      ].filter(Boolean) as Array<() => void>;
      this.unsub = () => offs.forEach((o) => o());
    } catch { /* preview sin SDK */ }
    // El «lleva N min sentada» de una mesa ocupada envejece mientras el plano está abierto.
    this.timer = setInterval(() => this.requestUpdate(), REFRESH_MS);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('erplora:locale-changed', this.onLocaleChange);
    this.unsub?.();
    if (this.timer) clearInterval(this.timer);
  }

  private async reload() {
    this.loading = true;
    try {
      const [z, t, people] = await Promise.all([
        erplora().queryAll('tables.zones.list', { sort: 'sort_order', dir: 'asc' }).catch(() => []),
        erplora().queryAll('tables.tables.list', { sort: 'number_sort', dir: 'asc' }).catch(() => []),
        // tables#74: the people behind `live_waiter_id`. Same door the KDS card and the printed
        // chit use (`hub.users.list`, ADR-0192) and the same policy on failure — no permission, no
        // SDK, an id the hub no longer lists: the plan paints, the tile just says nothing.
        erplora().query<HubUser[]>('hub.users.list').catch(() => [] as HubUser[]),
      ]);
      this.zones = rows<Zone>(z);
      this.waitersById = new Map(
        rows<HubUser>(people)
          .filter((u) => u && u.id && String(u.name ?? '').trim())
          .map((u) => [String(u.id), String(u.name).trim()]),
      );
      // tables#182: a room the host already arranged goes by its own (x, y), but one seeded by a
      // blueprint has NO coordinates, and then `autoLayoutTables` fills the grid in the order the
      // rows arrive. Ordering naturally here is what makes that grid read S1, S2, S3 … S10 instead
      // of S1, S10, S11, S12, S2 — the same rule the POS picker paints.
      this.tables = autoLayoutTables(sortNaturallyBy(rows<Table>(t), (m) => m.number, erplora().locale).map((m) => ({
        ...m,
        capacity: Number(m.capacity) || 1,
        is_active: Number(m.is_active),
        position_x: Number(m.position_x) || 0,
        position_y: Number(m.position_y) || 0,
        // tables#57: the box is kept AS THE ROW HAS IT. Defaulting it to `BOX` here erased the only
        // thing that tells a placed table from a seeded one, and every table looked placed — the
        // fallback for painting is `boxOf()`, which already substitutes `BOX` at the last moment.
        width: Number(m.width) || 0,
        height: Number(m.height) || 0,
      })));
      if (!this.activeZone || !this.zones.some((zo) => zo.id === this.activeZone)) {
        this.activeZone = this.zones[0]?.id ?? '';
      }
    } catch (e) {
      this.error = domainMessage(e, erplora().locale, erplora().t(CATALOG, 'ui.errLoadFloorPlan'));
    } finally {
      this.loading = false;
    }
  }

  private get tablesInZone(): Table[] {
    if (!this.activeZone) return this.tables;
    return this.tables.filter((t) => t.zone_id === this.activeZone);
  }

  private get activeZoneObj(): Zone | undefined {
    return this.zones.find((z) => z.id === this.activeZone);
  }

  private canvasEl(): HTMLElement | null {
    return this.renderRoot.querySelector('.canvas');
  }

  // ── Drag + clic-para-editar (pointer events) ────────────────────────────────────────────────
  private onPointerDown(t: Table, e: PointerEvent) {
    const canvas = this.canvasEl();
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    this.dragId = t.id;
    this.dragDX = e.clientX - rect.left - t.position_x;
    this.dragDY = e.clientY - rect.top - t.position_y;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.dragMoved = false;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    e.preventDefault();
  }

  private onPointerMove(e: PointerEvent) {
    if (!this.dragId) return;
    if (Math.abs(e.clientX - this.dragStartX) > DRAG_THRESHOLD || Math.abs(e.clientY - this.dragStartY) > DRAG_THRESHOLD) {
      this.dragMoved = true;
    }
    const canvas = this.canvasEl();
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dragged = this.tables.find((t) => t.id === this.dragId);
    const box = dragged ? boxOf(dragged) : { w: BOX, h: BOX };
    const maxX = Math.max(0, rect.width - box.w);
    const maxY = Math.max(0, rect.height - box.h);
    const x = Math.min(maxX, Math.max(0, e.clientX - rect.left - this.dragDX));
    const y = Math.min(maxY, Math.max(0, e.clientY - rect.top - this.dragDY));
    this.tables = this.tables.map((t) => (t.id === this.dragId ? { ...t, position_x: x, position_y: y } : t));
  }

  private async onPointerUp() {
    const id = this.dragId;
    this.dragId = undefined;
    if (!id) return;
    const t = this.tables.find((m) => m.id === id);
    if (!t) return;
    if (!this.dragMoved) {
      // Fue un clic (no arrastre): abrir el editor de la mesa.
      this.edit = { ...t };
      return;
    }
    try {
      // tables#53: se persiste LA CAJA DE ESTA MESA, no la de por defecto. Mandando `BOX` fijo,
      // arrastrar una mesa larga de 10 comensales la encogía y el plano dejaba de parecerse a la
      // sala en cuanto alguien la recolocaba.
      await erplora().command('tables.tables.move', {
        table_id: t.id,
        position_x: Math.round(t.position_x),
        position_y: Math.round(t.position_y),
        width: boxOf(t).w,
        height: boxOf(t).h,
      });
    } catch (e) {
      this.error = domainMessage(e, erplora().locale, erplora().t(CATALOG, 'ui.errSavePosition'));
    }
  }

  // ── Keyboard (tables#16): Enter/Space edits, arrows move (persisted like a drag) ─────────────
  private async onTableKey(t: Table, e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.edit = { ...t };
      return;
    }
    const step = e.shiftKey ? KEY_STEP * 4 : KEY_STEP;
    const delta: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const d = delta[e.key];
    if (!d) return;
    e.preventDefault();
    // Clamp to the canvas only when it has a layout (no layout → no clamp, e.g. before first paint).
    const rect = this.canvasEl()?.getBoundingClientRect();
    const box = boxOf(t);
    const maxX = rect && rect.width > 0 ? Math.max(0, rect.width - box.w) : Number.POSITIVE_INFINITY;
    const maxY = rect && rect.height > 0 ? Math.max(0, rect.height - box.h) : Number.POSITIVE_INFINITY;
    const x = Math.round(Math.min(maxX, Math.max(0, t.position_x + d[0])));
    const y = Math.round(Math.min(maxY, Math.max(0, t.position_y + d[1])));
    this.tables = this.tables.map((m) => (m.id === t.id ? { ...m, position_x: x, position_y: y } : m));
    try {
      await erplora().command('tables.tables.move', { table_id: t.id, position_x: x, position_y: y, width: boxOf(t).w, height: boxOf(t).h });
    } catch (err) {
      this.error = err instanceof Error ? err.message : erplora().t(CATALOG, 'ui.errSavePosition');
    }
  }

  /**
   * tables#74 — the NAME of whoever is serving this table, or '' when there is none to show.
   *
   * '' covers four cases on purpose and all of them paint the same nothing: the table is free, the
   * check carries no waiter (opened before tables#70), the hub does not list that id any more
   * (someone who left the shift), or the list could not be loaded. A raw UUID on a floor plan read
   * from across the room would be worse than a blank — nobody can act on it.
   */
  private waiterName(tb: Table): string {
    if (tb.status !== 'occupied' || !tb.live_waiter_id) return '';
    return this.waitersById.get(String(tb.live_waiter_id)) ?? '';
  }

  /**
   * tables#64 — what an OCCUPIED table says instead of its capacity: the party seated and how long
   * it has been sitting (Square paints the very same two on its floor plan). '' when the table is
   * not serving.
   *
   * Two wordings on purpose. The tile is 72 px wide, and «3 comensales · 35 min» does not fit — it
   * came out clipped mid-word in a real browser at 390 px, which is worse than not painting it. So
   * the TILE says «3 pax · 35 min», the same unit the capacity already uses right there, and the
   * accessible name (and the tooltip) keeps the unambiguous «3 comensales», where there is room.
   */
  private liveLine(tb: Table, t: (k: string, p?: Record<string, unknown>) => string, compact = false): string {
    if (tb.status !== 'occupied') return '';
    const seated = Number(tb.live_guests) || 0;
    if (!seated) return '';
    const minutes = minutesSince(tb.live_since, this.now());
    return [
      t(compact ? 'ui.paxCount' : 'ui.liveGuests', { count: seated }),
      minutes == null ? '' : t('ui.durationMinutes', { minutes }),
    ].filter(Boolean).join(' · ');
  }

  /** Accessible name of a table tile: «nº · zone · capacity · status» (+ party, waiter, hold). */
  private tableName(tb: Table, t: (k: string, p?: Record<string, unknown>) => string): string {
    const zone = this.zones.find((z) => z.id === tb.zone_id)?.name;
    const waiter = this.waiterName(tb);
    return [
      t('ui.tableLabel', { number: tb.number }),
      zone,
      t('ui.paxCount', { count: tb.capacity }),
      STATUS_KEY[tb.status] ? t(STATUS_KEY[tb.status]) : tb.status,
      this.liveLine(tb, t),
      waiter ? t('ui.servedBy', { name: waiter }) : '',
      tb.reserved_for ? t('ui.reservedFor', { name: tb.reserved_for }) : '',
    ].filter(Boolean).join(' · ');
  }

  /** Primera celda de la rejilla de esta zona que no tapa a ninguna mesa ya colocada. */
  private freeSpotInZone(): { x: number; y: number } {
    const taken = this.tablesInZone;
    for (let i = 0; ; i++) {
      const candidate = {
        id: '',
        position_x: AUTO_GAP + (i % AUTO_COLS) * AUTO_CELL,
        position_y: AUTO_GAP + Math.floor(i / AUTO_COLS) * AUTO_CELL,
        width: BOX,
        height: BOX,
      } as Table;
      if (!taken.some((t) => seTapan(t, candidate))) return { x: candidate.position_x, y: candidate.position_y };
    }
  }

  // ── Altas ───────────────────────────────────────────────────────────────────────────────────

  /** tables#83 — the running number is a DEFAULT, and it has to be FREE.
   *  Counting the tables and adding one lands on a number that is already on the plan as soon as
   *  one has been deleted (tables «1» and «3» → «3» again), and the floor shows two tiles reading
   *  the same thing. Nothing in the database forbids it, so the door that hands out the default
   *  is the one that has to skip what is taken. */
  private nextTableNumber(): string {
    const taken = new Set(this.tablesInZone.map((t) => String(t.number).trim()));
    let n = this.tablesInZone.length + 1;
    while (taken.has(String(n))) n++;
    return String(n);
  }

  private async addTable() {
    this.error = '';
    // tables#83: the sheet used to show a text field and create the table with the running number
    // anyway, so «QA1» became «1» in silence. What you type names the table (Square's «Custom
    // Table Names», Lightspeed, Clover); left blank, the running number still does the job
    // (TouchBistro, Odoo).
    const number = this.newTableNumber.trim() || this.nextTableNumber();
    // tables#53: la cascada de antes (`20 + (n*16) % 200`) era la misma unidad mal usada que en el
    // lote — offsets de 16 px para cajas de 72 —, así que la mesa nueva nacía tapando a la
    // anterior. El lienzo la recolocaría al recargar, y el plano daría un salto delante del
    // encargado. Nace ya en el primer hueco libre de la rejilla de SU zona.
    const spot = this.freeSpotInZone();
    try {
      await erplora().command('tables.tables.create', {
        zone_id: this.activeZone || null,
        number,
        name: '',
        capacity: 4,
        position_x: spot.x,
        position_y: spot.y,
        width: BOX,
        height: BOX,
        shape: 'square',
      });
      this.newTableNumber = '';
      this.addOpen = false;
      await this.reload();
    } catch (e) {
      this.error = domainMessage(e, erplora().locale, erplora().t(CATALOG, 'ui.errCreateTable'));
    }
  }

  private async addZone() {
    const name = this.newZoneName.trim();
    if (!name) return;
    this.error = '';
    try {
      await erplora().command('tables.zones.create', {
        name, description: '', color: 'primary', sort_order: this.zones.length,
      });
      this.newZoneName = '';
      this.addOpen = false;
      await this.reload();
      const created = this.zones.find((z) => z.name === name);
      if (created) this.activeZone = created.id;
    } catch (e) {
      this.error = domainMessage(e, erplora().locale, erplora().t(CATALOG, 'ui.errCreateZone'));
    }
  }

  // ── Edición / borrado de mesa ────────────────────────────────────────────────────────────────
  private patchEdit(p: Partial<Table>) { if (this.edit) this.edit = { ...this.edit, ...p }; }

  private async saveTable() {
    if (!this.edit) return;
    const t = this.edit;
    if (!String(t.number).trim()) { this.error = erplora().t(CATALOG, 'ui.errTableNumberRequired'); return; }
    this.saving = true; this.error = '';
    try {
      await erplora().command('tables.tables.update', {
        table_id: t.id,
        number: String(t.number).trim(),
        name: t.name ?? '',
        capacity: Math.max(1, Number(t.capacity) || 1),
        zone_id: t.zone_id ?? null,
        shape: t.shape,
        status: t.status,
        is_active: Number(t.is_active) ? 1 : 0,
      });
      this.edit = undefined;
      await this.reload();
    } catch (e) {
      this.error = domainMessage(e, erplora().locale, erplora().t(CATALOG, 'ui.errSaveTable'));
    } finally {
      this.saving = false;
    }
  }

  private async deleteTable() {
    if (!this.edit) return;
    this.saving = true; this.error = '';
    try {
      await erplora().command('tables.tables.delete', { table_id: this.edit.id });
      this.edit = undefined;
      await this.reload();
    } catch (e) {
      this.error = domainMessage(e, erplora().locale, erplora().t(CATALOG, 'ui.errDeleteTable'));
    } finally {
      this.saving = false;
    }
  }

  // ── Edición / borrado de zona ────────────────────────────────────────────────────────────────
  private async openZoneEdit() {
    const z = this.activeZoneObj;
    if (!z) return;
    this.error = '';
    try {
      // zones.get trae description (la lista no la incluye) para no perderla al actualizar.
      const full = await erplora().query<Zone | Zone[]>('tables.zones.get', { zone_id: z.id });
      const zo = Array.isArray(full) ? full[0] : full;
      this.zoneEdit = { ...z, ...(zo || {}) };
    } catch {
      this.zoneEdit = { ...z };
    }
  }

  private async saveZone() {
    if (!this.zoneEdit) return;
    const z = this.zoneEdit;
    if (!z.name.trim()) { this.error = erplora().t(CATALOG, 'ui.errZoneNameRequired'); return; }
    this.saving = true; this.error = '';
    try {
      await erplora().command('tables.zones.update', {
        zone_id: z.id,
        name: z.name.trim(),
        description: z.description ?? '',
        color: z.color ?? 'primary',
        sort_order: Number(z.sort_order) || 0,
        is_active: Number(z.is_active) ? 1 : 0,
      });
      this.zoneEdit = undefined;
      await this.reload();
    } catch (e) {
      this.error = domainMessage(e, erplora().locale, erplora().t(CATALOG, 'ui.errSaveZone'));
    } finally {
      this.saving = false;
    }
  }

  private async deleteZone() {
    if (!this.zoneEdit) return;
    this.saving = true; this.error = '';
    try {
      await erplora().command('tables.zones.delete', { zone_id: this.zoneEdit.id });
      this.zoneEdit = undefined;
      this.activeZone = '';
      await this.reload();
    } catch (e) {
      // El WASM rechaza si la zona tiene mesas activas (tables_attached).
      this.error = domainMessage(e, erplora().locale, erplora().t(CATALOG, 'ui.errDeleteZone'));
    } finally {
      this.saving = false;
    }
  }

  render() {
    const t = (k: string, params?: Record<string, unknown>): string => erplora().t(CATALOG, k, params);
    return html`
      <!-- tables#64 — at 390 px there used to be ~340 px of chrome before the first table: the view
           title (the shell topbar already paints it), a stray «Zone» input with «Add zone», «Add
           table», the zone segment and the colour legend, each on its own row. What is left is
           navigation: the zone segment, and behind two icon buttons everything that is
           configuration — the same shape Square gives its mobile floor plan. The legend is gone
           because the status is now written on every tile. -->
      <div class="zonebar">
        ${this.zones.length
          ? html`<ion-segment scrollable value=${this.activeZone}
              @ionChange=${(e: CustomEvent) => { this.activeZone = (e.detail as { value: string }).value; }}>
              ${this.zones.map((z) => html`<ion-segment-button value=${z.id}><ion-label>${z.name}</ion-label></ion-segment-button>`)}
            </ion-segment>`
          : html`<span class="flex"></span>`}
        <ion-button data-add fill="clear" aria-label=${t('ui.addAction')} title=${t('ui.addAction')}
          @click=${() => { this.addOpen = true; }}><ion-icon slot="icon-only" name="add-outline"></ion-icon></ion-button>
        <ion-button fill="clear" aria-label=${t('ui.editZone')} title=${t('ui.editZone')}
          ?disabled=${!this.activeZoneObj} @click=${() => this.openZoneEdit()}><ion-icon slot="icon-only" name="create-outline"></ion-icon></ion-button>
      </div>

      ${this.error ? html`<ok-inline-feedback tone="danger" icon="alert-circle-outline">${this.error}</ok-inline-feedback>` : nothing}

      <div class="canvas"
        @pointermove=${(e: PointerEvent) => this.onPointerMove(e)}
        @pointerup=${() => this.onPointerUp()}
        @pointercancel=${() => this.onPointerUp()}>
        ${this.tablesInZone.map((tb) => {
          const statusLabel = STATUS_KEY[tb.status] ? t(STATUS_KEY[tb.status]) : tb.status;
          const live = this.liveLine(tb, t, true);
          const waiter = this.waiterName(tb);
          return html`
          <div class=${`mesa ${tb.shape === 'round' ? 'round' : ''} ${tb.id === this.dragId && this.dragMoved ? 'dragging' : ''}`}
            role="button" tabindex="0"
            aria-label=${this.tableName(tb, t)}
            @keydown=${(e: KeyboardEvent) => this.onTableKey(tb, e)}
            style=${`left:${tb.position_x}px; top:${tb.position_y}px; width:${boxOf(tb).w}px; height:${boxOf(tb).h}px; border-color:${STATUS_COLOR[tb.status] ?? '#d9d6cf'}`}
            title=${[
              t('ui.tableTooltip', { status: statusLabel, count: tb.capacity }),
              live,
              waiter ? t('ui.servedBy', { name: waiter }) : '',
              tb.reserved_for
                ? `${t('ui.reservedFor', { name: tb.reserved_for })} ${[hhmm(tb.reserved_from), hhmm(tb.reserved_until)].filter(Boolean).join('–')}`.trim()
                : '',
            ].filter(Boolean).join(' · ')}
            @pointerdown=${(e: PointerEvent) => this.onPointerDown(tb, e)}>
            <div class="n">${tb.number}</div>
            <div class="c">${live || t('ui.paxCount', { count: tb.capacity })}</div>
            ${waiter ? html`<div class="w">${waiter}</div>` : nothing}
            ${tb.reserved_for
              ? html`<div class="hold">${tb.reserved_for}${tb.reserved_from ? ` · ${hhmm(tb.reserved_from)}` : ''}</div>`
              : nothing}
            <div class="s" style=${`color:${STATUS_COLOR[tb.status] ?? '#868e96'}`}>
              <ion-icon name=${STATUS_ICON[tb.status]?.icon ?? 'help-circle-outline'} aria-hidden="true"></ion-icon>${statusLabel}
            </div>
          </div>`;
        })}
        ${!this.loading && !this.zones.length ? html`<ok-empty-state icon="grid-outline" message=${t('ui.createZoneToStart')}></ok-empty-state>` : nothing}
        ${!this.loading && this.zones.length && !this.tablesInZone.length ? html`<ok-empty-state icon="square-outline" message=${t('ui.noTablesInZonePrompt')}></ok-empty-state>` : nothing}
        ${this.loading ? html`<div class="empty">${t('ui.loading')}</div>` : nothing}
      </div>
      <p class="hint">${t('ui.canvasHint')}</p>

      ${this.addOpen ? this.renderAddSheet() : nothing}
      ${this.edit ? this.renderTableSheet(this.edit) : nothing}
      ${this.zoneEdit ? this.renderZoneSheet(this.zoneEdit) : nothing}
    `;
  }

  /** tables#64 — the two configuration actions, out of the service header and behind the «+». */
  private renderAddSheet() {
    const t = (k: string, params?: Record<string, unknown>): string => erplora().t(CATALOG, k, params);
    return html`<div class="scrim" @click=${(e: Event) => { if ((e.target as HTMLElement).classList.contains('scrim')) this.addOpen = false; }}>
      <div class="sheet">
        <div class="sheet-h">
          <span class="t">${t('ui.addTitle')}</span>
          <ion-button class="x" fill="clear" aria-label=${t('ui.close')} @click=${() => { this.addOpen = false; }}><ion-icon slot="icon-only" name="close-outline"></ion-icon></ion-button>
        </div>
        <div class="add-block">
          <div class="field">
            <ion-input data-zone-name mode="md" fill="outline" label-placement="floating" label=${t('ui.colZone')} placeholder=${t('ui.newZonePlaceholder')} .value=${this.newZoneName}
              @ionInput=${(e: CustomEvent) => { this.newZoneName = (e.target as HTMLInputElement).value || ''; }}></ion-input>
          </div>
          <div class="add-act">
            <ion-button fill="outline" ?disabled=${this.saving || !this.newZoneName.trim()} @click=${() => this.addZone()}>${t('ui.addZone')}</ion-button>
          </div>
        </div>
        <div class="add-block">
          <div class="field">
            <ion-input data-table-number mode="md" fill="outline" label-placement="floating" label=${t('ui.fieldTableNumber')} placeholder=${t('ui.autoNumberPlaceholder')} .value=${this.newTableNumber}
              @ionInput=${(e: CustomEvent) => { this.newTableNumber = (e.target as HTMLInputElement).value || ''; }}></ion-input>
          </div>
          <div class="add-act">
            <ion-button ?disabled=${this.saving || !this.zones.length} @click=${() => this.addTable()}>${t('ui.addTable')}</ion-button>
          </div>
        </div>
      </div>
    </div>`;
  }

  private renderTableSheet(table: Table) {
    const t = (k: string, params?: Record<string, unknown>): string => erplora().t(CATALOG, k, params);
    return html`<div class="scrim" @click=${(e: Event) => { if ((e.target as HTMLElement).classList.contains('scrim')) this.edit = undefined; }}>
      <div class="sheet">
        <div class="sheet-h">
          <span class="t">${t('ui.editTable')}</span>
          <ion-button class="x" fill="clear" aria-label=${t('ui.close')} @click=${() => { this.edit = undefined; }}><ion-icon slot="icon-only" name="close-outline"></ion-icon></ion-button>
        </div>
        <div class="row2">
          <div class="field">
            <ion-input mode="md" fill="outline" label-placement="floating" label=${t('ui.fieldNumber')} .value=${table.number} @ionInput=${(e: CustomEvent) => this.patchEdit({ number: (e.target as HTMLInputElement).value || '' })}></ion-input></div>
          <div class="field">
            <ion-input mode="md" fill="outline" label-placement="floating" label=${t('ui.fieldCapacity')} type="number" min="1" .value=${String(table.capacity)} @ionInput=${(e: CustomEvent) => this.patchEdit({ capacity: Number((e.target as HTMLInputElement).value) || 1 })}></ion-input></div>
        </div>
        <div class="field">
          <ion-input mode="md" fill="outline" label-placement="floating" label=${t('ui.fieldNameOptional')} .value=${table.name} @ionInput=${(e: CustomEvent) => this.patchEdit({ name: (e.target as HTMLInputElement).value || '' })}></ion-input></div>
        <div class="row2">
          <div class="field">
            <ion-select mode="md" fill="outline" label-placement="floating" label=${t('ui.fieldShape')} .value=${table.shape} interface="popover" @ionChange=${(e: CustomEvent) => this.patchEdit({ shape: (e.detail as { value: string }).value })}>
              ${SHAPES.map((s) => html`<ion-select-option value=${s}>${t(SHAPE_KEY[s] ?? s)}</ion-select-option>`)}
            </ion-select></div>
          <div class="field">
            <ion-select mode="md" fill="outline" label-placement="floating" label=${t('ui.fieldStatus')} .value=${table.status} interface="popover" @ionChange=${(e: CustomEvent) => this.patchEdit({ status: (e.detail as { value: string }).value })}>
              ${STATUSES.map((s) => html`<ion-select-option value=${s}>${t(STATUS_KEY[s] ?? s)}</ion-select-option>`)}
            </ion-select></div>
        </div>
        <div class="field">
          <ion-select mode="md" fill="outline" label-placement="floating" label=${t('ui.fieldZone')} .value=${table.zone_id ?? ''} interface="popover" @ionChange=${(e: CustomEvent) => this.patchEdit({ zone_id: (e.detail as { value: string }).value || null })}>
            <ion-select-option value="">${t('ui.noZone')}</ion-select-option>
            ${this.zones.map((z) => html`<ion-select-option value=${z.id}>${z.name}</ion-select-option>`)}
          </ion-select></div>
        <div class="sheet-foot">
          <ion-button color="danger" fill="outline" ?disabled=${this.saving} @click=${() => this.deleteTable()}>${t('ui.delete')}</ion-button>
          <ion-button ?disabled=${this.saving} @click=${() => this.saveTable()}>${this.saving ? t('ui.saving') : t('ui.save')}</ion-button>
        </div>
      </div>
    </div>`;
  }

  private renderZoneSheet(z: Zone) {
    const t = (k: string, params?: Record<string, unknown>): string => erplora().t(CATALOG, k, params);
    return html`<div class="scrim" @click=${(e: Event) => { if ((e.target as HTMLElement).classList.contains('scrim')) this.zoneEdit = undefined; }}>
      <div class="sheet">
        <div class="sheet-h">
          <span class="t">${t('ui.editZone')}</span>
          <ion-button class="x" fill="clear" aria-label=${t('ui.close')} @click=${() => { this.zoneEdit = undefined; }}><ion-icon slot="icon-only" name="close-outline"></ion-icon></ion-button>
        </div>
        <div class="field">
          <ion-input mode="md" fill="outline" label-placement="floating" label=${t('ui.colName')} .value=${z.name} @ionInput=${(e: CustomEvent) => { this.zoneEdit = { ...z, name: (e.target as HTMLInputElement).value || '' }; }}></ion-input></div>
        <div class="field">
          <ion-input mode="md" fill="outline" label-placement="floating" label=${t('ui.fieldDescriptionOptional')} .value=${z.description ?? ''} @ionInput=${(e: CustomEvent) => { this.zoneEdit = { ...z, description: (e.target as HTMLInputElement).value || '' }; }}></ion-input></div>
        <div class="sheet-foot">
          <ion-button color="danger" fill="outline" ?disabled=${this.saving} @click=${() => this.deleteZone()}>${t('ui.deleteZone')}</ion-button>
          <ion-button ?disabled=${this.saving} @click=${() => this.saveZone()}>${this.saving ? t('ui.saving') : t('ui.save')}</ion-button>
        </div>
      </div>
    </div>`;
  }
}

define('erp-tables-canvas', ErpTablesCanvas);

declare global {
  interface HTMLElementTagNameMap {
    'erp-tables-canvas': ErpTablesCanvas;
  }
}
