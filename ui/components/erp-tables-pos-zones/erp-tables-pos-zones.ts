import { LitElement, html, css, nothing } from 'lit';
import { state } from 'lit/decorators.js';
import { define } from '@erplora/outfitkit/define';
// Catálogo i18n del módulo (ADR-0055): esbuild inlinea estos JSON en el `dist` del WC. Los textos
// internos se resuelven con `erplora.t(CATALOG, 'ui.clave')` (idioma activo, fallback locale→en→clave).
import esLocale from '../../../locales/es.json';
import enLocale from '../../../locales/en.json';
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
    .ctx { display:flex; align-items:center; gap:.15rem; }
    .trigger { --padding-start:.5rem; --padding-end:.5rem; }
    ion-button.trigger ion-icon { font-size: calc(var(--pos-hdr-icon-size, 1.75rem) * 1.05); }
    /* El icono hereda el tamaño que fija el TPV en la cabecera del carrito
       (la variable --pos-hdr-icon-size, que cruza el Shadow DOM); el fallback vale por si se monta
       en otro sitio.
       Material Symbols dibuja con menos trazo y menor viewBox que Ionicons, así que con el mismo
       número se ve MÁS PEQUEÑO: se compensa con el factor de abajo para que ópticamente cuadre. */
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
    .kebab { position:absolute; top:2px; right:2px; z-index:1; width:1.6rem; height:1.6rem; display:flex;
      align-items:center; justify-content:center; border:none; border-radius: var(--ok-radius-pill, 50%); background:rgba(0,0,0,.06);
      color:var(--ion-text-color,#1c1b18); cursor:pointer; font-size:1rem; line-height:1; }
    .kebab:hover { background:rgba(0,0,0,.14); }
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
      const [z, t] = await Promise.all([
        erplora().queryAll('tables.zones.list', { sort: 'sort_order', dir: 'asc' }).catch(() => []),
        erplora().queryAll('tables.tables.list', { sort: 'number', dir: 'asc' }).catch(() => []),
      ]);
      this.zones = rows<Zone>(z);
      this.tables = rows<Table>(t);
      if (!this.activeZone) this.activeZone = this.zones[0]?.id ?? '';
    } catch (e) {
      this.error = e instanceof Error ? e.message : erplora().t(CATALOG, 'ui.errLoadTables');
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
      const t = await erplora().queryAll('tables.tables.list', { sort: 'number', dir: 'asc' });
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
    let sessionId: string | undefined;
    let linkedOrderId: string | undefined; // ADR-0141: pedido que ya tiene abierto esta mesa
    // Manda la CUENTA VIVA, no el color de la mesa. Si la mesa ya tiene una, se reanuda con su
    // pedido (ADR-0141: la sesión es la junction mesa↔pedido); si no la tiene, se abre.
    //
    // tables#12: antes esto se decidía por `status === 'available'`, y una mesa `reserved` —que
    // desde #12 sí existe— caía en la rama de «reanudar» sin sesión que reanudar: el TPV se quedaba
    // con mesa y sin cuenta. Sentar una reserva es exactamente abrir su primera cuenta.
    const live = await this.activeSessionInfo(t.id);
    if (live) {
      sessionId = live.id;
      linkedOrderId = live.order_id || undefined;
    } else {
      try {
        await erplora().command('tables.sessions.open', { table_id: t.id });
        sessionId = await this.activeSessionFor(t.id);
      } catch (e) {
        this.error = e instanceof Error ? e.message : erplora().t(CATALOG, 'ui.errOccupyTable');
      }
    }
    this.sessionId = sessionId;
    this.selectedId = t.id;
    this.selectedLabel = erplora().t(CATALOG, 'ui.tableLabel', { number: t.number });
    this.emit(t.id, this.selectedLabel, linkedOrderId ?? null);
    this.open = false;
    void this.refreshTables();
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
  private cancelAction() { this.mode = 'select'; this.actionSource = undefined; }

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

  private get tablesInZone(): Table[] {
    if (!this.activeZone) return this.tables;
    return this.tables.filter((t) => t.zone_id === this.activeZone);
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
      <ion-button class="trigger" fill="clear" size="small" ?data-assigned=${!!this.selectedId}
        aria-label=${this.selectedId ? `${t('ui.assignTable')}: ${this.selectedLabel}` : t('ui.assignTable')}
        title=${this.selectedId ? `${t('ui.assignTable')}: ${this.selectedLabel}` : t('ui.assignTable')}
        @click=${() => this.openPicker()}>
        <ion-icon slot="icon-only" name=${this.selectedId ? 'ms-table-restaurant' : 'ms-table-restaurant-outline'}></ion-icon>
      </ion-button>

      <dialog class="sheet" aria-label=${title}
        @close=${() => { this.open = false; }}
        @click=${(e: Event) => { if (e.target === e.currentTarget) this.open = false; }}>
        <div class="sheet-h">
          <span class="t">${title}</span>
          <ion-button class="close" fill="clear" size="small" aria-label=${t('ui.close')} @click=${() => { this.open = false; }}>
            <ion-icon slot="icon-only" name="close-outline"></ion-icon>
          </ion-button>
        </div>

        ${this.error ? html`<p style="color:#d9480f">${this.error}</p>` : nothing}

        ${this.actionSource && !inAction
          ? html`<div class="actions">
              <span class="lbl">${t('ui.tableLabel', { number: srcNum })}</span>
              <ion-button size="small" fill="outline" @click=${() => this.startTransfer()}>
                <ion-icon slot="start" name="swap-horizontal-outline"></ion-icon>${t('ui.transfer')}
              </ion-button>
              <ion-button size="small" fill="outline" @click=${() => this.startMerge()}>
                <ion-icon slot="start" name="git-merge-outline"></ion-icon>${t('ui.merge')}
              </ion-button>
              <ion-button size="small" fill="outline" @click=${() => void this.doSplit()}>
                <ion-icon slot="start" name="git-branch-outline"></ion-icon>${t('ui.split')}
              </ion-button>
            </div>`
          : nothing}
        ${inAction
          ? html`<div class="hint">${this.mode === 'transfer' ? t('ui.pickFreeTable') : t('ui.pickOccupiedTable')}</div>`
          : nothing}

        ${this.zones.length
          ? html`<ion-segment scrollable value=${this.activeZone}
              @ionChange=${(e: CustomEvent) => { this.activeZone = (e.detail as { value: string }).value; }}>
              ${this.zones.map((z) => html`<ion-segment-button value=${z.id}><ion-label>${z.name}</ion-label></ion-segment-button>`)}
            </ion-segment>`
          : nothing}

        <div class="grid">
          ${this.tablesInZone.map((tb) => {
            const validTarget = inAction && this.isValidTarget(tb);
            const showKebab = !inAction && tb.status === 'occupied';
            return html`
            <div class="mesa-wrap">
              ${showKebab
                ? html`<button class="kebab" aria-label=${t('ui.tableActions')} @click=${(e: Event) => this.openActions(tb, e)}>
                    <ion-icon name="ellipsis-vertical"></ion-icon>
                  </button>`
                : nothing}
              <button class="mesa ${validTarget ? 'target' : ''}" aria-pressed=${this.selectedId === tb.id}
                ?disabled=${inAction && !validTarget}
                title=${holdTitle(tb) || nothing}
                style=${`border-color:${STATUS_COLOR[tb.status] ?? '#d9d6cf'}`} @click=${() => this.pick(tb)}>
                <div class="n">${tb.number}</div>
                <div class="c">${t('ui.paxCount', { count: tb.capacity })}</div>
                <div class="s" style=${`color:${STATUS_COLOR[tb.status] ?? '#868e96'}`}>${t(STATUS_KEY[tb.status] ?? tb.status)}</div>
                ${tb.reserved_for
                  ? html`<div class="hold">${tb.reserved_for}${tb.reserved_from ? html` · ${hhmm(tb.reserved_from)}` : nothing}</div>`
                  : nothing}
              </button>
            </div>`;
          })}
          ${!this.loading && !this.tablesInZone.length ? html`
            <div class="empty">
              <ion-icon name="grid-outline"></ion-icon>
              <p>${t('ui.noTablesInZone')}</p>
              <p class="empty-hint">${t('ui.noTablesInZoneHint')}</p>
            </div>` : nothing}
          ${this.loading ? html`<div class="empty">${t('ui.loading')}</div>` : nothing}
        </div>

        <div class="foot">
          ${!inAction && this.selectedId
            ? html`<ion-button color="danger" fill="clear" size="small" @click=${() => void this.clear()}>
                ${t('ui.removeTable')}
              </ion-button>`
            : nothing}
          ${inAction
            ? html`<ion-button fill="clear" size="small" @click=${() => this.cancelAction()}>${t('ui.cancel')}</ion-button>`
            : nothing}
        </div>
      </dialog>
    `;
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
