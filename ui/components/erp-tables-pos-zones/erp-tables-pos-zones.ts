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
  available: '#2f9e44',
  occupied: '#d9480f',
  reserved: '#f08c00',
  blocked: '#868e96',
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
    /* Mesa asignada: badge compacto con su X. El aspa es el objetivo táctil de soltar la mesa. */
    ion-chip.table-chip { --background:transparent; border-color:var(--ion-color-primary,#0091ce);
      color:var(--ion-color-primary,#0091ce); height:2rem; margin:0; font-weight:700; }
    ion-chip.table-chip ion-label { font-size:.8rem; max-width:8rem; overflow:hidden;
      text-overflow:ellipsis; white-space:nowrap; }
    ion-chip.table-chip .chip-x { cursor:pointer; font-size:1.05rem; margin-inline-start:.15rem; }
    ion-chip.table-chip .chip-x:hover { opacity:.7; }
    .trigger[data-assigned] { --color: var(--ion-color-primary,#0091ce); }
    .name { font-size:.8rem; font-weight:700; color:var(--ion-color-primary,#0091ce); max-width:9rem;
            overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    /* <dialog> nativo: showModal() lo pinta en el TOP LAYER del navegador, inmune al containing
       block del ion-toolbar donde vive el botón (transform/contain atrapan a position:fixed). Y
       sigue en el shadow root → conserva este CSS. */
    dialog.sheet { border:none; border-radius:16px; padding:1rem; width:min(94vw,32rem); max-height:90vh; overflow:auto;
      background:var(--ion-background-color,#fff); color:var(--ion-text-color,#1c1b18); box-shadow:0 12px 48px rgba(0,0,0,.35); }
    dialog.sheet::backdrop { background:rgba(0,0,0,.45); }
    .sheet-h { display:flex; justify-content:space-between; align-items:center; margin-bottom:.8rem; }
    .sheet-h .t { font-size:1.2rem; font-weight:700; }
    .x { background:none; border:none; font-size:1.3rem; cursor:pointer; color:#8b897f; }
    .grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(5rem, 1fr)); gap:.6rem; margin-top:.8rem; }
    .mesa-wrap { position:relative; }
    .mesa { width:100%; border:2px solid; border-radius:12px; padding:.6rem .4rem; cursor:pointer; text-align:center; background:var(--ion-background-color,#fff); transition:transform .05s; }
    .mesa:active { transform:scale(.96); }
    .mesa[aria-pressed=true] { outline:3px solid var(--ion-color-primary,#0091ce); outline-offset:1px; }
    .mesa[disabled] { opacity:.35; cursor:not-allowed; }
    .mesa.target { outline:2px dashed var(--ion-color-primary,#0091ce); outline-offset:1px; }
    .mesa .n { font-weight:700; font-size:1.05rem; }
    .mesa .c { font-size:.75rem; color:#8b897f; }
    .mesa .s { font-size:.65rem; text-transform:uppercase; letter-spacing:.03em; font-weight:600; }
    /* Botón ⋮ (more-vert) en la esquina de cada mesa OCUPADA: abre transferir/fusionar. */
    .kebab { position:absolute; top:2px; right:2px; z-index:1; width:1.6rem; height:1.6rem; display:flex;
      align-items:center; justify-content:center; border:none; border-radius:50%; background:rgba(0,0,0,.06);
      color:var(--ion-text-color,#1c1b18); cursor:pointer; font-size:1rem; line-height:1; }
    .kebab:hover { background:rgba(0,0,0,.14); }
    /* Menú de acciones (tras ⋮) y banner de "elige destino". */
    .actions { display:flex; gap:.5rem; align-items:center; flex-wrap:wrap; margin:.6rem 0; padding:.6rem .7rem;
      border-radius:12px; background:var(--ion-color-light,#f4f5f8); }
    .actions .lbl { font-weight:700; margin-right:auto; }
    .hint { margin:.6rem 0; padding:.5rem .7rem; border-radius:10px; background:var(--ion-color-light,#f4f5f8);
      font-size:.85rem; color:#8b897f; }
    .empty { color:#8b897f; text-align:center; padding:1.5rem 0; }
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

  // Re-render al cambiar el idioma del shell (ADR-0055): los textos del template se re-evalúan
  // con el nuevo `erplora.locale`.
  private readonly onLocaleChange = (): void => this.requestUpdate();

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('erp:order-context-reset', this.onReset);
    this.addEventListener('erp:order-linked', this.onOrderLinked);
    this.addEventListener('erp:order-restored', this.onOrderRestored);
    window.addEventListener('erplora:locale-changed', this.onLocaleChange);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('erp:order-context-reset', this.onReset);
    this.removeEventListener('erp:order-linked', this.onOrderLinked);
    this.removeEventListener('erp:order-restored', this.onOrderRestored);
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

  /** El TPV reanudó un pedido tras recargar → recupera SU mesa desde la junction (ADR-0144).
   *
   *  `sales` no sabe de mesas, así que no puede restaurar este contexto: lo hace su dueño. Sin
   *  esto, al recargar el TPV la comanda aparecía «sin mesa» aunque la mesa siguiera ocupada, y el
   *  camarero no tenía forma de saber a qué mesa pertenecía lo que estaba viendo. */
  private readonly onOrderRestored = async (e: Event): Promise<void> => {
    const orderId = (e as CustomEvent<{ order_id?: string }>).detail?.order_id;
    if (!orderId || this.selectedId) return;
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

  /** El POS abrió un pedido con esta mesa seleccionada → se escribe la junction (ADR-0141). */
  private readonly onOrderLinked = async (e: Event): Promise<void> => {
    const d = (e as CustomEvent<{ order_id?: string }>).detail;
    if (!d?.order_id || !this.selectedId) return;
    try {
      await erplora().command('tables.sessions.link_order', { table_id: this.selectedId, order_id: d.order_id });
    } catch { /* el enlace es operativo, no debe romper la venta */ }
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
    if (this.mode === 'transfer') return t.status === 'available';
    if (this.mode === 'merge') return t.status !== 'available';
    return true;
  }

  private async pick(t: Table) {
    // En modo destino, un toque elige la mesa a la que transferir/fusionar (solo válidas).
    if (this.mode === 'transfer') { if (this.isValidTarget(t)) await this.doTransfer(t); return; }
    if (this.mode === 'merge') { if (this.isValidTarget(t)) await this.doMerge(t); return; }
    if (t.id === this.selectedId) return;
    this.error = '';
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
    if (t.status === 'available') {
      // Mesa libre → ocupar (abrir sesión). El runtime rechaza si dejó de estar disponible.
      try {
        await erplora().command('tables.sessions.open', { table_id: t.id });
        sessionId = await this.activeSessionFor(t.id);
      } catch (e) {
        this.error = e instanceof Error ? e.message : erplora().t(CATALOG, 'ui.errOccupyTable');
      }
    } else {
      // Mesa ya ocupada/reservada → reanudar su sesión activa (no abrir otra) Y su pedido, para que
      // el POS recupere la comanda tal cual quedó (ADR-0141: la sesión es la junction mesa↔pedido).
      const info = await this.activeSessionInfo(t.id);
      sessionId = info?.id;
      linkedOrderId = info?.order_id || undefined;
    }
    this.sessionId = sessionId;
    this.selectedId = t.id;
    this.selectedLabel = erplora().t(CATALOG, 'ui.tableLabel', { number: t.number });
    this.emit(t.id, this.selectedLabel, linkedOrderId ?? null);
    this.open = false;
    void this.refreshTables();
  }

  private async clear() {
    if (this.sessionId) { await this.closeSession(this.sessionId); this.sessionId = undefined; }
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
    // Botón propio (ADR-0043 B): el POS monta este WC en el header (slot sales.pos.assign) como UN
    // botón-icono independiente del de cliente. Abre SU modal; al elegir mesa se cierra y emite
    // `erp:order-context`. El nombre de la mesa asignada lo muestra el chip del POS, no este botón.
    return html`
      ${this.selectedId
        ? html`
          <!-- Mesa asignada: badge con su nombre y una X para soltarla. Sustituye al botón de texto
               'Quitar mesa', que estaba escondido en el pie del modal: aquí se ve qué mesa llevas y
               se quita de un toque. Si la comanda tiene productos NO se pierde: el POS la aparca. -->
          <ion-chip class="table-chip" outline @click=${() => this.openPicker()}
                    title=${this.selectedLabel} aria-label=${this.selectedLabel}>
            <ion-icon name="ms-table-restaurant"></ion-icon>
            <ion-label>${this.selectedLabel}</ion-label>
            <ion-icon name="close-circle" class="chip-x" role="button" tabindex="0"
                      aria-label=${t('ui.removeTable')} title=${t('ui.removeTable')}
                      @click=${(e: Event) => { e.stopPropagation(); void this.clear(); }}></ion-icon>
          </ion-chip>`
        : html`
          <ion-button class="trigger" fill="clear" size="small"
            aria-label=${t('ui.assignTable')} title=${t('ui.assignTable')}
            @click=${() => this.openPicker()}>
            <ion-icon slot="icon-only" name="ms-table-restaurant-outline"></ion-icon>
          </ion-button>`}

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
                style=${`border-color:${STATUS_COLOR[tb.status] ?? '#d9d6cf'}`} @click=${() => this.pick(tb)}>
                <div class="n">${tb.number}</div>
                <div class="c">${t('ui.paxCount', { count: tb.capacity })}</div>
                <div class="s" style=${`color:${STATUS_COLOR[tb.status] ?? '#868e96'}`}>${t(STATUS_KEY[tb.status] ?? tb.status)}</div>
              </button>
            </div>`;
          })}
          ${!this.loading && !this.tablesInZone.length ? html`<div class="empty">${t('ui.noTablesInZone')}</div>` : nothing}
          ${this.loading ? html`<div class="empty">${t('ui.loading')}</div>` : nothing}
        </div>

        <div class="foot">
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
