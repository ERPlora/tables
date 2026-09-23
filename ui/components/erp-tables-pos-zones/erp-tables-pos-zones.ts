import { LitElement, html, css, nothing } from 'lit';
import { state } from 'lit/decorators.js';
import { define } from '@erplora/outfitkit/define';
// Catálogo i18n del módulo (ADR-0055): esbuild inlinea estos JSON en el `dist` del WC. Los textos
// internos se resuelven con `erplora.t(CATALOG, 'ui.clave')` (idioma activo, fallback locale→en→clave).
import esLocale from '../../../locales/es.json';
import enLocale from '../../../locales/en.json';
import { domainMessage, errorCode } from '../../lib/domain-error';
import { sortNaturallyBy } from '../../lib/natural-order';
import { can } from '../../lib/permissions';
const CATALOG: Record<string, unknown> = { es: esLocale, en: enLocale };

// erp-tables-pos-zones — selector de MESA inyectado en la pantalla de venta (ADR-0043). El módulo
// `tables` declara en su manifest que rellena el slot `sales.pos.order_context`; el shell monta este
// Web Component dentro del POS de `sales`. El POS NO conoce a `tables`: la comunicación es por
// eventos del DOM (contrato), igual que queries/commands/eventos entre módulos.
//
//   ─ emite `erp:order-context` {table_id, label}  → el POS adjunta la mesa a la venta.
//   ─ escucha `erp:order-context-reset`            → el POS la dispara tras cobrar; limpia selección.
//
// UI: un botón que abre un modal con pestañas por ZONA (ion-segment) y una rejilla de mesas
// coloreadas por estado. Las mesas salen de las queries públicas de `tables` (no toca sus tablas).

interface Zone { id: string; name: string; }
interface Table {
  id: string; number: string; name: string; capacity: number;
  status: string; zone_id: string | null; zone: string | null;
  // tables#12: retención viva de la mesa (`tables.tables.list`). Sin nombre ni hora, «Reservada»
  // es solo un color y el encargado no sabe si le da tiempo a sentar a alguien antes.
  reserved_for?: string | null;
  reserved_from?: string | null;
  reserved_until?: string | null;
  reserved_party_size?: number | null;
  // tables#32: covers of the LIVE party (oldest open check), NULL on a free table.
  live_guests?: number | null;
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

const STATUS_COLOR: Record<string, string> = {
  available: 'var(--ion-color-success, #2f9e44)',
  occupied: 'var(--ion-color-danger, #d9480f)',
  reserved: 'var(--ion-color-warning, #f08c00)',
  blocked: 'var(--ion-color-medium, #868e96)',
};

const STATUS_KEY: Record<string, string> = {
  available: 'ui.statusAvailable',
  occupied: 'ui.statusOccupied',
  reserved: 'ui.statusReserved',
  blocked: 'ui.statusBlocked',
};

function erplora(): ErploraLike {
  const c = (globalThis as { erplora?: ErploraLike }).erplora;
  if (!c) throw new Error('erplora SDK no inicializado por el shell');
  return c;
}

/** `2026-08-07T21:00:00+00:00` → `21:00`, en la zona horaria del dispositivo. La sala razona en
 *  horas, no en ISO; una fecha entera no cabe en la celda de una mesa. */
function hhmm(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Tooltip de una mesa retenida: quién, cuántos y en qué franja. Lo que no cabe pintado en la
 *  celda sigue estando a un hover/long-press de distancia. */
function holdTitle(t: { reserved_for?: string | null; reserved_from?: string | null;
  reserved_until?: string | null; reserved_party_size?: number | null; }): string {
  if (!t.reserved_for) return '';
  const span = [hhmm(t.reserved_from), hhmm(t.reserved_until)].filter(Boolean).join('–');
  const pax = t.reserved_party_size ? ` (${t.reserved_party_size})` : '';
  return `${t.reserved_for}${pax}${span ? ` · ${span}` : ''}`;
}

function rows<T>(r: unknown): T[] {
  if (Array.isArray(r)) return r as T[];
  if (r && typeof r === 'object' && Array.isArray((r as { rows?: T[] }).rows)) return (r as { rows: T[] }).rows;
  return [];
}

export class ErpTablesPosZones extends LitElement {
  static styles = css`
    :host { display:block; font-family: system-ui, sans-serif; color: var(--ion-text-color,#1c1b18); }
    /* tables#16: every Ionic control is a 44px touch target. The table tile (native <button
       aria-pressed>, tables#11 documented canvas exception), the covers stepper (3rem) and the
       quick chips (2.75rem) already are. */
    ion-button { min-height:44px; --min-height:44px; }
    .ctx { display:flex; align-items:center; gap:.15rem; }
    .trigger { --padding-start:.5rem; --padding-end:.5rem; }
    ion-button.trigger ion-icon { font-size: var(--pos-hdr-icon-size, 1.75rem); }
    /* The icon inherits the size the POS sets on the cart header (--pos-hdr-icon-size crosses the
       Shadow DOM); the fallback covers mounting elsewhere. tables#37: the trigger is an ion: icon
       again (grid / grid-outline, the same glyph the POS chip and the module's own Tables entry
       use), so no optical compensation for a foreign set is needed — the toolkit only bakes ion:. */
    .trigger[data-assigned] { --color: var(--ion-color-primary,#0091ce); }
    .name { font-size:.8rem; font-weight:700; color:var(--ion-color-primary,#0091ce); max-width:9rem;
            overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    /* <dialog> nativo: showModal() lo pinta en el TOP LAYER del navegador, inmune al containing
       block del ion-toolbar donde vive el botón (transform/contain atrapan a position:fixed). Y
       sigue en el shadow root → conserva este CSS. */
    dialog.sheet { border:none; border-radius: var(--ok-radius-lg, 16px); padding:1rem; width:min(94vw,32rem); max-height:90vh; overflow:auto;
      background:var(--ion-background-color,#fff); color:var(--ion-text-color,#1c1b18); box-shadow:0 12px 48px rgba(0,0,0,.35); }
    dialog.sheet::backdrop { background:rgba(0,0,0,.45); }
    .sheet-h { display:flex; justify-content:space-between; align-items:center; margin-bottom:.8rem; }
    .sheet-h .t { font-size:1.2rem; font-weight:700; }
    .x { background:none; border:none; font-size:1.3rem; cursor:pointer; color:#8b897f; }
    .grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(5rem, 1fr)); gap:.6rem; margin-top:.8rem; }
    .mesa-wrap { position:relative; }
    .mesa { width:100%; border:2px solid; border-radius: var(--ok-radius, 12px); padding:.6rem .4rem; cursor:pointer; text-align:center; background:var(--ion-background-color,#fff); transition:transform .05s; }
    .mesa:active { transform:scale(.96); }
    .mesa[aria-pressed=true] { outline:3px solid var(--ion-color-primary,#0091ce); outline-offset:1px; }
    .mesa[disabled] { opacity:.35; cursor:not-allowed; }
    .mesa.target { outline:2px dashed var(--ion-color-primary,#0091ce); outline-offset:1px; }
    .mesa .n { font-weight:700; font-size:1.05rem; }
    .mesa .c { font-size:.75rem; color:#8b897f; }
    .mesa .s { font-size:.65rem; text-transform:uppercase; letter-spacing:.03em; font-weight:600; }
    /* Nombre y hora de la reserva viva. Cabe en la celda porque es lo unico que el encargado
       necesita de un vistazo; el resto va en el tooltip. */
    .mesa .hold { font-size:.65rem; color:var(--ion-color-warning,#f08c00); font-weight:600;
      overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    /* Botón ⋮ (more-vert) en la esquina de cada mesa OCUPADA: abre transferir/fusionar. */
    /* ion-button (tables#11): 44px target overlapping the tile corner; the tile keeps its own tap. */
    ion-button.kebab { position:absolute; top:-6px; right:-6px; z-index:1; margin:0; --padding-start:0; --padding-end:0;
      width:44px; height:44px; --border-radius: var(--ok-radius-pill, 50%); --color:var(--ion-text-color,#1c1b18); font-size:1rem; }
    /* Menú de acciones (tras ⋮) y banner de "elige destino". */
    .actions { display:flex; gap:.5rem; align-items:center; flex-wrap:wrap; margin:.6rem 0; padding:.6rem .7rem;
      border-radius: var(--ok-radius, 12px); background:var(--ion-color-light,#f4f5f8); }
    .actions .lbl { font-weight:700; margin-right:auto; }
    .hint { margin:.6rem 0; padding:.5rem .7rem; border-radius: var(--ok-radius-sm, 10px); background:var(--ion-color-light,#f4f5f8);
      font-size:.85rem; color:#8b897f; }
    /* Empty-state con aire: icono + qué pasa + qué hacer (antes: texto estrujado en un panel
       encogido — el panel toma un ancho mínimo digno aunque no haya mesas). */
    .empty { color:#8b897f; text-align:center; padding:1.6rem 1rem; min-width:16rem; }
    .empty ion-icon { font-size:2rem; opacity:.5; display:block; margin:0 auto .4rem; }
    .empty p { margin:.15rem 0; }
    .empty .empty-hint { font-size:.82rem; opacity:.75; }
    .foot { display:flex; justify-content:space-between; align-items:center; margin-top:1rem; }
    /* tables#32: covers prompt. Touch targets >= 44px (tables#16): the stepper and the quick
       chips are what a waiter taps with one hand while standing. */
    .guests { display:flex; flex-direction:column; gap:.8rem; padding:.4rem 0; }
    .guests .stepper { display:flex; align-items:center; justify-content:center; gap:1rem; }
    .guests .stepper button { width:3rem; height:3rem; border-radius: var(--ok-radius-pill, 50%);
      border:2px solid var(--ion-color-primary,#0091ce); background:var(--ion-background-color,#fff);
      color:var(--ion-color-primary,#0091ce); font-size:1.5rem; line-height:1; cursor:pointer; }
    .guests .stepper button:disabled { opacity:.35; cursor:not-allowed; }
    .guests .value { font-size:2.4rem; font-weight:700; min-width:3rem; text-align:center; }
    .guests .quick { display:grid; grid-template-columns: repeat(4, 1fr); gap:.5rem; }
    .guests .quick button { min-height:2.75rem; border-radius: var(--ok-radius, 12px);
      border:1px solid var(--ion-color-medium,#868e96); background:var(--ion-color-light,#f4f5f8);
      color:var(--ion-text-color,#1c1b18); font-size:1.05rem; font-weight:600; cursor:pointer; }
    .guests .quick button[aria-pressed=true] { border-color:var(--ion-color-primary,#0091ce);
      color:var(--ion-color-primary,#0091ce); }
    .guests .over { text-align:center; font-size:.85rem; color:var(--ion-color-warning,#f08c00); }
    .guests .cta { display:flex; justify-content:space-between; align-items:center; gap:.5rem; }
    .guests .cta .seat { flex:1; }
    .mesa .live { font-size:.75rem; font-weight:700; color:var(--ion-color-danger,#d9480f);
      display:flex; align-items:center; justify-content:center; gap:.2rem; }
    /* pm#392 — a danger outline/clear button paints from HERE, never from \`color="danger"\`:
       Ionic resolves \`color=\` through a GLOBAL \`.ion-color-danger\` rule that does not reach
       inside this shadow root, so it fell back to the primary blue. Custom properties do inherit
       through the boundary, so the theme token still applies. */
    ion-button.tone-danger[fill] {
      --border-color: var(--ion-color-danger, #c5000f);
      --color: var(--ion-color-danger, #c5000f);
      --background-activated: var(--ion-color-danger, #c5000f);
      --background-focused: var(--ion-color-danger, #c5000f);
    }
  `;

  @state() private open = false;
  @state() private zones: Zone[] = [];
  @state() private tables: Table[] = [];
  @state() private activeZone = '';
  @state() private selectedId?: string;
  @state() private selectedLabel = '';
  @state() private loading = false;
  @state() private error = '';
  /** Sales solo comparte el contador, nunca las líneas. Con pendientes de cocina no se cambia de
   *  cuenta/mesa: primero hay que validar la comanda actual. */
  @state() private pendingCount = 0;
  @state() private kitchenEnabled = false;
  /** Modo del selector: `select` = elegir mesa; `transfer`/`merge` = elegir mesa DESTINO tras el
   *  menú ⋮ de una mesa ocupada (punto 4/3). */
  @state() private mode: 'select' | 'transfer' | 'merge' = 'select';
  /** Mesa ORIGEN sobre la que se abrió el menú ⋮ (transferir/fusionar). */
  @state() private actionSource?: { id: string; number: string };

  /** tables#32: covers prompt. `seat` = a free table was touched (seat the party with N covers);
   *  `edit` = ⋮ → Guests on an occupied table (correct the live check). Default = capacity /
   *  live covers; quick chips seat in one tap; +/− for the rest. */
  @state() private guestsPrompt?: { kind: 'seat' | 'edit'; table: Table; value: number };

  /** Room setting `prompt_guests_on_seat` (tables#3 c). Off = a bar that never counts covers:
   *  seating a free table opens the check with the capacity in ONE tap (Lightspeed "Cover count
   *  prompt", Square "Track seating" are toggles too). Default on. */
  private promptGuests = true;

  /** Sesión activa de la mesa seleccionada (la abrimos al ocupar, o la reanudamos si ya estaba). */
  private sessionId?: string;

  // Tras cobrar, el POS dispara este reset: la mesa queda pagada → cerramos su sesión (la libera).
  private readonly onReset = () => {
    const sid = this.sessionId;
    this.selectedId = undefined;
    this.selectedLabel = '';
    this.sessionId = undefined;
    this.mode = 'select';
    this.actionSource = undefined;
    this.guestsPrompt = undefined;
    if (sid) void this.closeSession(sid);
  };

  private readonly onPosState = (e: Event): void => {
    const detail = (e as CustomEvent<{ pending_count?: number; kitchen_enabled?: boolean }>).detail;
    const value = Number(detail?.pending_count ?? 0);
    this.pendingCount = Number.isFinite(value) ? Math.max(0, value) : 0;
    this.kitchenEnabled = detail?.kitchen_enabled === true;
  };

  // Re-render al cambiar el idioma del shell (ADR-0055): los textos del template se re-evalúan
  // con el nuevo `erplora.locale`.
  private readonly onLocaleChange = (): void => this.requestUpdate();

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('erp:pos-state', this.onPosState);
    this.addEventListener('erp:order-context-reset', this.onReset);
    this.addEventListener('erp:order-linked', this.onOrderLinked);
    this.addEventListener('erp:order-restored', this.onOrderRestored);
    this.addEventListener('erp:order-parked', this.onOrderParked);
    this.addEventListener('erp:order-detached', this.onOrderDetached);
    window.addEventListener('erplora:locale-changed', this.onLocaleChange);
  }

  disconnectedCallback() {
    this.removeEventListener('erp:pos-state', this.onPosState);
    super.disconnectedCallback();
    this.removeEventListener('erp:order-context-reset', this.onReset);
    this.removeEventListener('erp:order-linked', this.onOrderLinked);
    this.removeEventListener('erp:order-restored', this.onOrderRestored);
    this.removeEventListener('erp:order-parked', this.onOrderParked);
    this.removeEventListener('erp:order-detached', this.onOrderDetached);
    window.removeEventListener('erplora:locale-changed', this.onLocaleChange);
  }

  private async openPicker() {
    this.open = true;
    this.loading = true;
    this.error = '';
    try {
      const [z, t, s] = await Promise.all([
        erplora().queryAll('tables.zones.list', { sort: 'sort_order', dir: 'asc' }).catch(() => []),
        erplora().queryAll('tables.tables.list', { sort: 'number_sort', dir: 'asc' }).catch(() => []),
        // tables#3 (c): room settings — no row (or no permission) → the schema default: prompt ON.
        erplora().query('tables.settings.get').catch(() => []),
      ]);
      this.zones = rows<Zone>(z);
      this.tables = rows<Table>(t);
      const settings = rows<{ prompt_guests_on_seat?: number | boolean }>(s)[0];
      this.promptGuests = settings ? Number(settings.prompt_guests_on_seat) !== 0 : true;
      if (!this.activeZone) this.activeZone = this.zones[0]?.id ?? '';
    } catch (e) {
      this.error = domainMessage(e, erplora().locale, erplora().t(CATALOG, 'ui.errLoadTables'));
    } finally {
      this.loading = false;
    }
  }

  private emit(table_id: string | null, label: string, order_id?: string | null) {
    // ADR-0141: la sesión es la JUNCTION mesa↔pedido. Al elegir mesa le decimos al POS QUÉ pedido
    // tiene abierta esa mesa (o null si aún ninguno) para que reanude su comanda desde la BD.
    this.dispatchEvent(new CustomEvent('erp:order-context', {
      detail: { table_id, label, order_id: order_id ?? null }, bubbles: true, composed: true,
    }));
  }

  /** El TPV aparcó la cuenta → esta mesa se suelta, pero la cuenta sigue viva (ADR-0146).
   *
   *  La sesión pasa a `parked` conservando comensales, camarero y desde cuándo se atiende; su tramo
   *  de historial se cierra con motivo `parked`, y la mesa queda libre para otros. */
  /** El TPV suelta la cuenta DE LA PANTALLA («Dejar en la mesa»): se limpia SOLO la selección
   *  local — ni park ni close. La mesa sigue ocupada con su cuenta, recuperable tocándola. */
  private readonly onOrderDetached = (): void => {
    this.sessionId = undefined;
    this.selectedId = undefined;
    this.selectedLabel = '';
  };

  private readonly onOrderParked = async (): Promise<void> => {
    if (!this.sessionId) return;
    const sid = this.sessionId;
    this.sessionId = undefined;
    this.selectedId = undefined;
    this.selectedLabel = '';
    try {
      await erplora().command('tables.sessions.park', { session_id: sid });
    } catch { /* aparcar no puede romper la venta: la cuenta sigue abierta igualmente */ }
    void this.refreshTables();
  };

  /** El TPV reanudó un pedido tras recargar → recupera SU mesa desde la junction (ADR-0144).
   *
   *  `sales` no sabe de mesas, así que no puede restaurar este contexto: lo hace su dueño. Sin
   *  esto, al recargar el TPV la comanda aparecía «sin mesa» aunque la mesa siguiera ocupada, y el
   *  camarero no tenía forma de saber a qué mesa pertenecía lo que estaba viendo. */
  private readonly onOrderRestored = async (e: Event): Promise<void> => {
    const orderId = (e as CustomEvent<{ order_id?: string }>).detail?.order_id;
    if (!orderId) return;
    // El host puede avisar dos veces: una durante su restauración y otra al terminar de montar
    // los slots. Si la primera llega antes de que Ventas escuche `erp:order-context`, Mesas ya
    // tiene la selección pero el ticket todavía no conoce su etiqueta. Reemitir es idempotente y
    // garantiza que ambos módulos converjan aunque se carguen en distinto orden.
    if (this.selectedId) {
      this.emit(this.selectedId, this.selectedLabel, orderId);
      return;
    }
    try {
      const r = await erplora().query('tables.sessions.by_order', { order_id: orderId });
      const s = rows<{ session_id?: string; table_id?: string; table_number?: string; status?: string }>(r)
        .find((x) => x.status === 'active');
      if (!s?.table_id) return; // el pedido no es de mesa (barra/mostrador)
      this.sessionId = s.session_id;
      this.selectedId = s.table_id;
      this.selectedLabel = erplora().t(CATALOG, 'ui.tableLabel', { number: s.table_number ?? '' });
      // Devuelve el contexto al TPV para que pinte la mesa de la comanda que acaba de reanudar.
      this.emit(s.table_id, this.selectedLabel, orderId);
    } catch { /* si no se puede resolver, el TPV sigue: la comanda no depende de la mesa */ }
  };

  /** The POS opened an order → write the table↔order junction (ADR-0141).
   *
   *  tables#26: the event carries the ACCOUNT (`session_id`) whenever the POS knows it — `sales`
   *  republishes, untouched, the id it got in `erp:order-split`. It has to win over the table:
   *  `link_order` without a session resolves to the OLDEST account of the table (back-compat for
   *  the single-account POS), so on a split table the second order would land on the first half,
   *  leaving two sessions on the same order and both halves charging one ticket.
   *
   *  It also removes the dependency on the SELECTED table: splitting is asked from the ⋮ of any
   *  table in the plan, which need not be the selected one — bailing out there left the new
   *  account with no order. Without a `session_id`, today's path (selected table) stands. */
  private readonly onOrderLinked = async (e: Event): Promise<void> => {
    const d = (e as CustomEvent<{ order_id?: string; session_id?: string }>).detail;
    if (!d?.order_id) return;
    const target = d.session_id
      ? { session_id: d.session_id, order_id: d.order_id }
      : (this.selectedId ? { table_id: this.selectedId, order_id: d.order_id } : null);
    if (!target) return; // counter/bar order: nothing to hang it from
    try {
      await erplora().command('tables.sessions.link_order', target);
    } catch { /* linking is operational, it must not break the sale */ }
  };

  /** Id de la sesión `active` de una mesa (para reanudar/cerrar), o undefined si no hay. */
  private async activeSessionFor(tableId: string): Promise<string | undefined> {
    return (await this.activeSessionInfo(tableId))?.id;
  }

  /** Sesión activa de una mesa CON su pedido enlazado (junction ADR-0141). */
  private async activeSessionInfo(tableId: string): Promise<{ id: string; order_id?: string } | undefined> {
    try {
      const r = await erplora().query('tables.sessions.list', { f_table_id: tableId, f_status: 'active', limit: 1 });
      return rows<{ id: string; order_id?: string }>(r)[0];
    } catch { return undefined; }
  }

  private async closeSession(id: string) {
    try { await erplora().command('tables.sessions.close', { session_id: id }); }
    catch { /* ya cerrada o cobrada por otro flujo → no romper */ }
  }

  /** Recarga el estado de las mesas (colores ocupada/libre) tras abrir/cerrar una sesión. */
  private async refreshTables() {
    try {
      const t = await erplora().queryAll('tables.tables.list', { sort: 'number_sort', dir: 'asc' });
      this.tables = rows<Table>(t);
    } catch { /* ignore */ }
  }

  /** ¿Es `t` un destino válido para el modo activo? transfer→mesa libre; merge→mesa ocupada;
   *  nunca la propia mesa origen. */
  private isValidTarget(t: Table): boolean {
    if (t.id === this.actionSource?.id) return false;
    if (this.mode === 'transfer') return t.status === 'available' || t.status === 'reserved';
    if (this.mode === 'merge') return t.status !== 'available';
    return true;
  }

  private async pick(t: Table) {
    // En modo destino, un toque elige la mesa a la que transferir/fusionar (solo válidas).
    if (this.mode === 'transfer') { if (this.isValidTarget(t)) await this.doTransfer(t); return; }
    if (this.mode === 'merge') { if (this.isValidTarget(t)) await this.doMerge(t); return; }
    if (t.id === this.selectedId) return;
    this.error = '';
    // Segunda puerta de lo de arriba: la celda ya está deshabilitada, pero el teclado, un
    // `pick()` desde otro flujo o una mesa que se bloqueó mientras el plano estaba abierto no
    // pasan por el `disabled` del DOM. Nadie manda una apertura que el gate va a revertir.
    if (t.status === 'blocked') {
      this.error = erplora().t(CATALOG, 'ui.blockedHint');
      void this.refreshTables();
      return;
    }
    if (this.kitchenEnabled && this.pendingCount > 0) {
      this.error = erplora().t(CATALOG, 'ui.sendPendingBeforeTable', { count: this.pendingCount });
      return;
    }
    // Cambiar de mesa antes de cobrar: libera la anterior SOLO si no tiene comanda.
    //
    // ADR-0141: la sesión es la JUNCTION mesa↔pedido, así que cerrarla PIERDE el enlace con la
    // comanda. Antes daba igual (el carrito se guardaba aparte, por `table_id`), pero ahora cerrar
    // la sesión de una mesa con comanda abierta hacía desaparecer sus líneas al volver a ella.
    // Regla: si la mesa que dejamos ya tiene pedido enlazado, sigue OCUPADA (es su comanda viva);
    // solo se libera la que tocamos por error y quedó sin pedir nada. Se cierra al cobrar (reset).
    if (this.sessionId && this.selectedId && this.selectedId !== t.id) {
      const prev = await this.activeSessionInfo(this.selectedId);
      if (!prev?.order_id) {
        await this.closeSession(this.sessionId);
      }
      this.sessionId = undefined;
    }
    // Manda la CUENTA VIVA, no el color de la mesa. Si la mesa ya tiene una, se reanuda con su
    // pedido (ADR-0141: la sesión es la junction mesa↔pedido); si no la tiene, se abre.
    //
    // tables#12: antes esto se decidía por `status === 'available'`, y una mesa `reserved` —que
    // desde #12 sí existe— caía en la rama de «reanudar» sin sesión que reanudar: el TPV se quedaba
    // con mesa y sin cuenta. Sentar una reserva es exactamente abrir su primera cuenta.
    const live = await this.activeSessionInfo(t.id);
    if (live) {
      this.settle(t, live.id, live.order_id || undefined);
      return;
    }
    // tables#32: seating a party asks for the covers first (Toast/Lightspeed/Square do the same):
    // default = the table capacity (or the reservation's party size), quick chips seat in one tap.
    const seed = t.reserved_party_size && t.reserved_party_size > 0 ? t.reserved_party_size : t.capacity;
    const covers = Math.max(1, Number(seed) || 1);
    if (!this.promptGuests) {
      await this.seat(t, covers);
      return;
    }
    this.guestsPrompt = { kind: 'seat', table: t, value: covers };
  }

  /** Opens the check of a free table with `guests` covers and hands the table to the POS. */
  private async seat(t: Table, guests: number) {
    this.guestsPrompt = undefined;
    try {
      await erplora().command('tables.sessions.open', { table_id: t.id, guests_count: guests });
    } catch (e) {
      // La guarda de apertura revierte la transacción ENTERA cuando la mesa no está sentable, así
      // que aquí no hay ni sesión ni mesa ocupada. Con la bloqueada ya apagada arriba, lo que
      // queda es la carrera real: otro TPV se adelantó entre que se pintó el plano y este toque
      // (tables#14).
      //
      // Dos cosas que antes no pasaban: el mensaje era el texto CRUDO de la base de datos («CHECK
      // constraint failed…»), y la mesa se asignaba igual —`settle` corría también en el catch—,
      // así que el TPV se quedaba atendiendo una mesa que no había abierto. Ahora se dice qué pasó,
      // se relee el plano (la mesa ya sale ocupada) y el selector sigue abierto para elegir otra.
      //
      // tables#55: y se dice por el CÓDIGO, no por suposición. Hasta que la guarda tuvo el suyo,
      // este catch traducía CUALQUIER fallo a «otro dispositivo se adelantó» — también un
      // permiso, una mesa borrada o una caída de red, con lo que el camarero refrescaba el plano
      // buscando una carrera que no había existido. `tables.table_not_available` es la carrera;
      // lo demás cuenta lo suyo.
      if (errorCode(e) && errorCode(e) !== 'tables.table_not_available') {
        this.error = domainMessage(e, erplora().locale, erplora().t(CATALOG, 'ui.errOccupyTable'));
        return;
      }
      this.error = erplora().t(CATALOG, 'ui.errTableTaken');
      await this.refreshTables();
      return;
    }
    this.settle(t, await this.activeSessionFor(t.id), undefined);
  }

  /** The table is the POS context now: remember its live check, tell the POS, close the sheet. */
  private settle(t: Table, sessionId: string | undefined, linkedOrderId: string | undefined) {
    this.sessionId = sessionId;
    this.selectedId = t.id;
    this.selectedLabel = erplora().t(CATALOG, 'ui.tableLabel', { number: t.number });
    this.emit(t.id, this.selectedLabel, linkedOrderId ?? null);
    this.open = false;
    void this.refreshTables();
  }

  // ── Covers prompt (tables#32) ────────────────────────────────────────────────

  /** +/− reads the CURRENT value (two fast taps must not both apply to the same stale render). */
  private bumpGuests(delta: number) {
    if (!this.guestsPrompt) return;
    this.guestsPrompt = { ...this.guestsPrompt, value: Math.max(1, Math.floor(this.guestsPrompt.value + delta)) };
  }

  /** Confirm the prompt: seat the party (free table) or correct the live check (⋮ → Guests). */
  private async confirmGuests(value = this.guestsPrompt?.value) {
    const p = this.guestsPrompt;
    if (!p || !value) return;
    if (p.kind === 'seat') { await this.seat(p.table, value); return; }
    const info = await this.activeSessionInfo(p.table.id);
    if (!info?.id) { this.error = erplora().t(CATALOG, 'ui.errNoActiveSession'); return; }
    try {
      await erplora().command('tables.sessions.set_guests', { session_id: info.id, guests_count: value });
      this.guestsPrompt = undefined;
      this.actionSource = undefined;
      void this.refreshTables();
    } catch (e) {
      this.error = e instanceof Error ? e.message : erplora().t(CATALOG, 'ui.errSetGuests');
    }
  }

  private cancelGuests() { this.guestsPrompt = undefined; }

  /** ⋮ → Guests: correct the covers of the live check, pre-filled with what the plan shows. */
  private startEditGuests() {
    const src = this.actionSource;
    const t = src && this.tables.find((x) => x.id === src.id);
    if (!t) return;
    this.guestsPrompt = { kind: 'edit', table: t, value: Math.max(1, Number(t.live_guests) || t.capacity || 1) };
  }

  private async clear() {
    // Quitar la mesa = APARCAR la sesión (decisión Ioan 2026-07-19): la mesa queda libre y la
    // sesión sobrevive como «aparcada» (ADR-0146), recuperable. Cerrarla era terminal: la
    // cuenta perdía su rastro de servicio.
    if (this.kitchenEnabled && this.pendingCount > 0) {
      this.error = erplora().t(CATALOG, 'ui.sendPendingBeforeTable', { count: this.pendingCount });
      this.open = true;
      return;
    }
    if (this.sessionId) {
      const sid = this.sessionId;
      this.sessionId = undefined;
      try { await erplora().command('tables.sessions.park', { session_id: sid }); } catch { /* la cuenta sigue abierta igualmente */ }
    }
    this.selectedId = undefined;
    this.selectedLabel = '';
    this.emit(null, '');
    this.open = false;
    void this.refreshTables();
  }

  // ── Transferir / Fusionar (menú ⋮ de una mesa ocupada) ───────────────────────

  /** Abre el menú de acciones (⋮) sobre una mesa ocupada. Detiene la propagación para no
   *  disparar el `pick` de la celda. */
  private openActions(t: Table, e: Event) {
    e.stopPropagation();
    this.error = '';
    this.actionSource = { id: t.id, number: t.number };
    this.mode = 'select';
  }

  private startTransfer() { this.mode = 'transfer'; }
  private startMerge() { this.mode = 'merge'; }

  /** tables#12 — dividir la cuenta. A diferencia de transferir/fusionar NO pide mesa destino: la
   *  segunda cuenta se queda en la misma mesa (dos cuentas, un mantel), que es lo que pide la sala.
   *  `tables` abre la cuenta; las líneas y los importes los reparte `sales` al recibir el evento. */
  private async doSplit() {
    const src = this.actionSource;
    if (!src) return;
    const info = await this.activeSessionInfo(src.id);
    if (!info?.id) { this.error = erplora().t(CATALOG, 'ui.errNoActiveSession'); return; }
    try {
      const res = await erplora().command<{ new_ids?: string[] }>(
        'tables.sessions.split', { session_id: info.id });
      // La cuenta nueva nace SIN pedido: `sales` materializa el suyo y lo cuelga de ella con
      // `tables.sessions.link_order`, por eso viaja su id (sin él, el pedido aterrizaría en la
      // cuenta original y las dos mitades cobrarían la misma comanda).
      this.dispatchEvent(new CustomEvent('erp:order-split', {
        detail: {
          table_id: src.id,
          from_order_id: info.order_id ?? null,
          session_id: res?.new_ids?.[0] ?? null,
          label: erplora().t(CATALOG, 'ui.tableLabel', { number: src.number }),
        },
        bubbles: true, composed: true,
      }));
      this.mode = 'select';
      this.actionSource = undefined;
      this.open = false;
      void this.refreshTables();
    } catch (e) {
      this.error = e instanceof Error ? e.message : erplora().t(CATALOG, 'ui.errSplit');
    }
  }
  private cancelAction() { this.mode = 'select'; this.actionSource = undefined; this.guestsPrompt = undefined; }

  /** Emite hacia el POS el movimiento de comanda (mover en transfer, combinar en merge). El POS
   *  (erp-pos-touch/desktop) mueve/fusiona el carrito por `table_id`; contrato por evento DOM. */
  private emitCartMove(
    type: 'erp:order-transfer' | 'erp:order-merge', fromId: string, target: Table,
    orders: { from?: string; to?: string } = {},
  ) {
    // ADR-0141: viajan también los PEDIDOS. Transferir no mueve líneas (el pedido es el mismo, solo
    // cambia de mesa); fusionar sí: el POS suma las líneas del origen en el destino y lo anula.
    this.dispatchEvent(new CustomEvent(type, {
      detail: {
        from_table_id: fromId,
        to_table_id: target.id,
        from_order_id: orders.from ?? null,
        to_order_id: orders.to ?? null,
        to_label: erplora().t(CATALOG, 'ui.tableLabel', { number: target.number }),
      },
      bubbles: true, composed: true,
    }));
  }

  private async doTransfer(target: Table) {
    const src = this.actionSource;
    if (!src) return;
    const info = await this.activeSessionInfo(src.id);
    const sid = info?.id;
    // Pedido de la mesa ORIGEN, leído ANTES de mover (después la sesión origen queda 'transferred').
    const srcOrderId = info?.order_id || undefined;
    if (!sid) { this.error = erplora().t(CATALOG, 'ui.errNoActiveSession'); return; }
    try {
      await erplora().command('tables.sessions.transfer', { session_id: sid, target_table_id: target.id });
      // El pedido NO se mueve: sigue siendo el mismo, ahora colgado de la mesa destino (la sesión
      // nueva arrastró el order_id). Se avisa al POS solo para que actualice su contexto.
      this.emitCartMove('erp:order-transfer', src.id, target, { from: srcOrderId, to: srcOrderId });
      await this.afterMove(src.id, target);
    } catch (e) {
      this.error = e instanceof Error ? e.message : erplora().t(CATALOG, 'ui.errTransfer');
    }
  }

  private async doMerge(target: Table) {
    const src = this.actionSource;
    if (!src) return;
    const info = await this.activeSessionInfo(src.id);
    const sid = info?.id;
    // Los DOS pedidos, leídos antes de fusionar: el POS suma el del origen en el del destino.
    const srcOrderId = info?.order_id || undefined;
    const dstOrderId = (await this.activeSessionInfo(target.id))?.order_id || undefined;
    if (!sid) { this.error = erplora().t(CATALOG, 'ui.errNoActiveSession'); return; }
    try {
      await erplora().command('tables.sessions.merge', { session_id: sid, target_table_id: target.id });
      // Fusionar SÍ mueve líneas: el POS suma la comanda del origen en la del destino y anula la
      // del origen (una sola cuenta en una sola mesa).
      this.emitCartMove('erp:order-merge', src.id, target, { from: srcOrderId, to: dstOrderId });
      await this.afterMove(src.id, target);
    } catch (e) {
      this.error = e instanceof Error ? e.message : erplora().t(CATALOG, 'ui.errMerge');
    }
  }

  /** Tras transferir/fusionar: la comanda vive ahora en el DESTINO. Si SEGUÍAMOS en la mesa origen,
   *  la selección pasa a la mesa destino (si no, el POS conserva la mesa que estuviera atendiendo). */
  private async afterMove(srcId: string, target: Table) {
    if (this.selectedId === srcId) {
      this.selectedId = target.id;
      this.sessionId = await this.activeSessionFor(target.id);
      this.selectedLabel = erplora().t(CATALOG, 'ui.tableLabel', { number: target.number });
    }
    this.mode = 'select';
    this.actionSource = undefined;
    this.open = false;
    void this.refreshTables();
  }

  /** Tables of the active zone, in NATURAL order (tables#182): `S2` before `S10`, and a named
   *  table (`Terraza A`) stays alphabetical — the criterion is per row, not per room. Ordering
   *  here and not at the query is deliberate: the picker loads EVERY table once and re-filters by
   *  zone on each tap, so the order the grid paints is this component's, not the caller's `sort`. */
  private get tablesInZone(): Table[] {
    const inZone = this.activeZone
      ? this.tables.filter((t) => t.zone_id === this.activeZone)
      : this.tables;
    return sortNaturallyBy(inZone, (t) => t.number, erplora().locale);
  }

  render() {
    const t = (k: string, params?: Record<string, unknown>): string => erplora().t(CATALOG, k, params);
    const inAction = this.mode !== 'select';
    const srcNum = this.actionSource?.number ?? '';
    const title = this.mode === 'transfer' ? t('ui.transferTitle', { number: srcNum })
      : this.mode === 'merge' ? t('ui.mergeTitle', { number: srcNum })
      : t('ui.chooseTable');
    // Botón propio (ADR-0043 B): permanece SIEMPRE libre en el header para asignar/cambiar mesa.
    // La mesa elegida se muestra como contexto de la cuenta, igual que el cliente; dentro del
    // selector queda la acción de retirarla. Así elegir Mesa 6 no sustituye el botón por un chip.
    return html`
      <ion-button data-testid="tables-pos-trigger" class="trigger" fill="clear" ?data-assigned=${!!this.selectedId}
        aria-label=${this.selectedId ? `${t('ui.assignTable')}: ${this.selectedLabel}` : t('ui.assignTable')}
        title=${this.selectedId ? `${t('ui.assignTable')}: ${this.selectedLabel}` : t('ui.assignTable')}
        @click=${() => this.openPicker()}>
        <ion-icon slot="icon-only" name=${this.selectedId ? 'grid' : 'grid-outline'}></ion-icon>
      </ion-button>

      <dialog data-testid="tables-pos-sheet" class="sheet" aria-label=${title}
        @close=${() => { this.open = false; }}
        @click=${(e: Event) => { if (e.target === e.currentTarget) this.open = false; }}>
        <div class="sheet-h">
          <span class="t">${title}</span>
          <ion-button data-testid="tables-pos-close" class="close" fill="clear" aria-label=${t('ui.close')} @click=${() => { this.open = false; }}>
            <ion-icon slot="icon-only" name="close-outline"></ion-icon>
          </ion-button>
        </div>

        ${this.error ? html`<p data-testid="tables-pos-error" style="color:#d9480f">${this.error}</p>` : nothing}

        ${this.guestsPrompt ? this.renderGuestsPrompt(t) : nothing}

        ${this.actionSource && !inAction && !this.guestsPrompt
          ? html`<div class="actions">
              <span class="lbl">${t('ui.tableLabel', { number: srcNum })}</span>
              ${can('tables.transfer_tablesession')
                ? html`<ion-button data-testid="tables-pos-transfer" fill="outline" @click=${() => this.startTransfer()}>
                <ion-icon slot="start" name="swap-horizontal-outline"></ion-icon>${t('ui.transfer')}
              </ion-button>
              <ion-button data-testid="tables-pos-merge" fill="outline" @click=${() => this.startMerge()}>
                <ion-icon slot="start" name="git-merge-outline"></ion-icon>${t('ui.merge')}
              </ion-button>`
                : nothing}
              <ion-button data-testid="tables-pos-split" fill="outline" @click=${() => void this.doSplit()}>
                <ion-icon slot="start" name="git-branch-outline"></ion-icon>${t('ui.split')}
              </ion-button>
              <ion-button data-testid="tables-pos-guests" fill="outline" @click=${() => this.startEditGuests()}>
                <ion-icon slot="start" name="people-outline"></ion-icon>${t('ui.guests')}
              </ion-button>
            </div>`
          : nothing}
        ${inAction
          ? html`<div class="hint" data-testid="tables-pos-hint">${this.mode === 'transfer' ? t('ui.pickFreeTable') : t('ui.pickOccupiedTable')}</div>`
          : nothing}

        ${this.zones.length && !this.guestsPrompt
          ? html`<ion-segment data-testid="tables-pos-zones" scrollable value=${this.activeZone}
              @ionChange=${(e: CustomEvent) => { this.activeZone = (e.detail as { value: string }).value; }}>
              ${this.zones.map((z) => html`<ion-segment-button data-testid=${`tables-pos-zone-tab-${z.id}`} value=${z.id}><ion-label>${z.name}</ion-label></ion-segment-button>`)}
            </ion-segment>`
          : nothing}

        ${this.guestsPrompt ? nothing : html`<div class="grid">
          ${this.tablesInZone.map((tb) => {
            const validTarget = inAction && this.isValidTarget(tb);
            const showKebab = !inAction && tb.status === 'occupied';
            // tables#14: una mesa bloqueada NO es un destino, y eso ya se sabe aquí. Antes se podía
            // tocar: el TPV mandaba la apertura, el gate `table_available` la revertía y el
            // camarero recibía un «no se pudo ocupar la mesa» después de esperar, por algo que no
            // dependía de la red. Toast la saca del servicio con su propio estado («Block Table»);
            // aquí se apaga la celda y el motivo va en el título, además del estado que ya pinta.
            const outOfService = tb.status === 'blocked';
            return html`
            <div class="mesa-wrap">
              ${showKebab
                ? html`<ion-button data-testid=${`tables-pos-actions-${tb.id}`} class="kebab" fill="clear" aria-label=${t('ui.tableActions')} @click=${(e: Event) => this.openActions(tb, e)}>
                    <ion-icon slot="icon-only" name="ellipsis-vertical"></ion-icon>
                  </ion-button>`
                : nothing}
              <button data-testid=${`tables-pos-table-${tb.id}`} class="mesa ${validTarget ? 'target' : ''}" aria-pressed=${this.selectedId === tb.id}
                ?disabled=${outOfService || (inAction && !validTarget)}
                title=${(outOfService ? t('ui.blockedHint') : holdTitle(tb)) || nothing}
                style=${`border-color:${STATUS_COLOR[tb.status] ?? '#d9d6cf'}`} @click=${() => this.pick(tb)}>
                <div class="n">${tb.number}</div>
                <div class="c">${t('ui.paxCount', { count: tb.capacity })}</div>
                ${tb.live_guests
                  ? html`<div class="live"><ion-icon name="people-outline"></ion-icon>${t('ui.liveGuests', { count: tb.live_guests })}</div>`
                  : nothing}
                <div class="s" style=${`color:${STATUS_COLOR[tb.status] ?? '#868e96'}`}>${t(STATUS_KEY[tb.status] ?? tb.status)}</div>
                ${tb.reserved_for
                  ? html`<div class="hold">${tb.reserved_for}${tb.reserved_from ? html` · ${hhmm(tb.reserved_from)}` : nothing}</div>`
                  : nothing}
              </button>
            </div>`;
          })}
          ${!this.loading && !this.tablesInZone.length ? html`
            <div class="empty" data-testid="tables-pos-empty">
              <ion-icon name="grid-outline"></ion-icon>
              <p>${t('ui.noTablesInZone')}</p>
              <p class="empty-hint">${t('ui.noTablesInZoneHint')}</p>
            </div>` : nothing}
          ${this.loading ? html`<div class="empty" data-testid="tables-pos-loading">${t('ui.loading')}</div>` : nothing}
        </div>`}

        <div class="foot">
          ${!inAction && this.selectedId
            ? html`<ion-button data-testid="tables-pos-remove" class="tone-danger" fill="clear" @click=${() => void this.clear()}>
                ${t('ui.removeTable')}
              </ion-button>`
            : nothing}
          ${inAction
            ? html`<ion-button data-testid="tables-pos-cancel" fill="clear" @click=${() => this.cancelAction()}>${t('ui.cancel')}</ion-button>`
            : nothing}
        </div>
      </dialog>
    `;
  }

  /** tables#32: the covers prompt — big stepper, quick chips 1..8 (one tap seats), CTA. */
  private renderGuestsPrompt(t: (k: string, params?: Record<string, unknown>) => string) {
    const p = this.guestsPrompt!;
    const over = p.value > p.table.capacity;
    const cta = p.kind === 'seat' ? t('ui.seatGuests', { count: p.value }) : t('ui.saveGuests');
    return html`
      <div class="guests" data-testid="tables-pos-guests-prompt" role="group" aria-label=${t('ui.guestsTitle', { number: p.table.number })}>
        <div class="hint">${t('ui.guestsTitle', { number: p.table.number })} · ${t('ui.paxCount', { count: p.table.capacity })}</div>
        <div class="stepper">
          <button data-testid="tables-pos-guests-minus" class="minus" aria-label="−" ?disabled=${p.value <= 1} @click=${() => this.bumpGuests(-1)}>−</button>
          <span data-testid="tables-pos-guests-value" class="value" aria-live="polite">${p.value}</span>
          <button data-testid="tables-pos-guests-plus" class="plus" aria-label="+" @click=${() => this.bumpGuests(1)}>+</button>
        </div>
        <div class="quick">
          ${[1, 2, 3, 4, 5, 6, 7, 8].map((n) => html`
            <button data-testid=${`tables-pos-guests-quick-${n}`} aria-pressed=${p.value === n} @click=${() => void this.confirmGuests(n)}>${n}</button>`)}
        </div>
        ${over ? html`<div class="over" data-testid="tables-pos-guests-over">${t('ui.overCapacity', { capacity: p.table.capacity })}</div>` : nothing}
        <div class="cta">
          <ion-button data-testid="tables-pos-guests-back" class="back" fill="clear" @click=${() => this.cancelGuests()}>${t('ui.back')}</ion-button>
          <ion-button data-testid="tables-pos-guests-confirm" class="seat" size="default" @click=${() => void this.confirmGuests()}>${cta}</ion-button>
        </div>
      </div>`;
  }

  /** Sincroniza `open` ↔ el <dialog> nativo: showModal() usa el top layer y escapa cualquier trap.
   *  try/catch porque happy-dom (tests) no implementa showModal/close. */
  protected updated() {
    const d = this.renderRoot.querySelector('dialog') as HTMLDialogElement | null;
    if (!d) return;
    try {
      if (this.open && !d.open) d.showModal();
      else if (!this.open && d.open) d.close();
    } catch { /* entorno sin <dialog> modal (happy-dom): el estado `open` sigue siendo la verdad */ }
  }
}

define('erp-tables-pos-zones', ErpTablesPosZones);

declare global {
  interface HTMLElementTagNameMap {
    'erp-tables-pos-zones': ErpTablesPosZones;
  }
}
