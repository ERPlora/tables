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
    .trigger[data-assigned] { --color: var(--ion-color-primary,#0091ce); }
    .name { font-size:.8rem; font-weight:700; color:var(--ion-color-primary,#0091ce); max-width:9rem;
            overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .scrim { position:fixed; inset:0; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; z-index:60; }
    .sheet { background:var(--ion-background-color,#fff); border-radius:16px; padding:1rem; width:min(94vw,32rem); max-height:90vh; overflow:auto; box-shadow:0 12px 48px rgba(0,0,0,.35); }
    .sheet-h { display:flex; justify-content:space-between; align-items:center; margin-bottom:.8rem; }
    .sheet-h .t { font-size:1.2rem; font-weight:700; }
    .x { background:none; border:none; font-size:1.3rem; cursor:pointer; color:#8b897f; }
    .grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(5rem, 1fr)); gap:.6rem; margin-top:.8rem; }
    .mesa { border:2px solid; border-radius:12px; padding:.6rem .4rem; cursor:pointer; text-align:center; background:var(--ion-background-color,#fff); transition:transform .05s; }
    .mesa:active { transform:scale(.96); }
    .mesa[aria-pressed=true] { outline:3px solid var(--ion-color-primary,#0091ce); outline-offset:1px; }
    .mesa .n { font-weight:700; font-size:1.05rem; }
    .mesa .c { font-size:.75rem; color:#8b897f; }
    .mesa .s { font-size:.65rem; text-transform:uppercase; letter-spacing:.03em; font-weight:600; }
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

  /** Sesión activa de la mesa seleccionada (la abrimos al ocupar, o la reanudamos si ya estaba). */
  private sessionId?: string;

  // Tras cobrar, el POS dispara este reset: la mesa queda pagada → cerramos su sesión (la libera).
  private readonly onReset = () => {
    const sid = this.sessionId;
    this.selectedId = undefined;
    this.selectedLabel = '';
    this.sessionId = undefined;
    if (sid) void this.closeSession(sid);
  };

  // Re-render al cambiar el idioma del shell (ADR-0055): los textos del template se re-evalúan
  // con el nuevo `erplora.locale`.
  private readonly onLocaleChange = (): void => this.requestUpdate();

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('erp:order-context-reset', this.onReset);
    window.addEventListener('erplora:locale-changed', this.onLocaleChange);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('erp:order-context-reset', this.onReset);
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

  private emit(table_id: string | null, label: string) {
    this.dispatchEvent(new CustomEvent('erp:order-context', {
      detail: { table_id, label }, bubbles: true, composed: true,
    }));
  }

  /** Id de la sesión `active` de una mesa (para reanudar/cerrar), o undefined si no hay. */
  private async activeSessionFor(tableId: string): Promise<string | undefined> {
    try {
      const r = await erplora().query('tables.sessions.list', { f_table_id: tableId, f_status: 'active', limit: 1 });
      return rows<{ id: string }>(r)[0]?.id;
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

  private async pick(t: Table) {
    if (t.id === this.selectedId) { this.open = false; return; }
    this.error = '';
    // Cambiar de mesa antes de cobrar: libera la anterior si la habíamos ocupado nosotros.
    if (this.sessionId && this.selectedId && this.selectedId !== t.id) {
      await this.closeSession(this.sessionId);
      this.sessionId = undefined;
    }
    let sessionId: string | undefined;
    if (t.status === 'available') {
      // Mesa libre → ocupar (abrir sesión). El runtime rechaza si dejó de estar disponible.
      try {
        await erplora().command('tables.sessions.open', { table_id: t.id });
        sessionId = await this.activeSessionFor(t.id);
      } catch (e) {
        this.error = e instanceof Error ? e.message : erplora().t(CATALOG, 'ui.errOccupyTable');
      }
    } else {
      // Mesa ya ocupada/reservada → reanudar su sesión activa (no abrir otra).
      sessionId = await this.activeSessionFor(t.id);
    }
    this.sessionId = sessionId;
    this.selectedId = t.id;
    this.selectedLabel = erplora().t(CATALOG, 'ui.tableLabel', { number: t.number });
    this.emit(t.id, this.selectedLabel);
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

  private get tablesInZone(): Table[] {
    if (!this.activeZone) return this.tables;
    return this.tables.filter((t) => t.zone_id === this.activeZone);
  }

  render() {
    const t = (k: string, params?: Record<string, unknown>): string => erplora().t(CATALOG, k, params);
    return html`
      <div class="ctx">
        <ion-button class="trigger" fill="clear" size="small"
          aria-label=${this.selectedLabel || t('ui.assignTable')}
          title=${this.selectedLabel || t('ui.assignTable')}
          ?data-assigned=${!!this.selectedId} @click=${() => this.openPicker()}>
          <ion-icon slot="icon-only" name=${this.selectedId ? 'restaurant' : 'restaurant-outline'}></ion-icon>
        </ion-button>
        ${this.selectedLabel ? html`<span class="name" title=${this.selectedLabel}>${this.selectedLabel}</span>` : nothing}
      </div>

      ${this.open
        ? html`<div class="scrim" @click=${(e: Event) => { if ((e.target as HTMLElement).classList.contains('scrim')) this.open = false; }}>
            <div class="sheet" role="dialog" aria-modal="true" aria-label=${t('ui.chooseTable')}>
              <div class="sheet-h">
                <span class="t">${t('ui.chooseTable')}</span>
                <ion-button class="close" fill="clear" size="small" aria-label=${t('ui.close')}
                  @click=${() => { this.open = false; }}>
                  <ion-icon slot="icon-only" name="close-outline"></ion-icon>
                </ion-button>
              </div>

              ${this.error ? html`<p style="color:#d9480f">${this.error}</p>` : nothing}

              ${this.zones.length
                ? html`<ion-segment scrollable value=${this.activeZone}
                    @ionChange=${(e: CustomEvent) => { this.activeZone = (e.detail as { value: string }).value; }}>
                    ${this.zones.map((z) => html`<ion-segment-button value=${z.id}><ion-label>${z.name}</ion-label></ion-segment-button>`)}
                  </ion-segment>`
                : nothing}

              <div class="grid">
                ${this.tablesInZone.map((tb) => html`
                  <button class="mesa" aria-pressed=${this.selectedId === tb.id}
                    style=${`border-color:${STATUS_COLOR[tb.status] ?? '#d9d6cf'}`} @click=${() => this.pick(tb)}>
                    <div class="n">${tb.number}</div>
                    <div class="c">${t('ui.paxCount', { count: tb.capacity })}</div>
                    <div class="s" style=${`color:${STATUS_COLOR[tb.status] ?? '#868e96'}`}>${t(STATUS_KEY[tb.status] ?? tb.status)}</div>
                  </button>`)}
                ${!this.loading && !this.tablesInZone.length ? html`<div class="empty">${t('ui.noTablesInZone')}</div>` : nothing}
                ${this.loading ? html`<div class="empty">${t('ui.loading')}</div>` : nothing}
              </div>

              <div class="foot">
                <ion-button fill="clear" size="small" ?disabled=${!this.selectedId} @click=${() => this.clear()}>${t('ui.removeTable')}</ion-button>
              </div>
            </div>
          </div>`
        : nothing}
    `;
  }
}

define('erp-tables-pos-zones', ErpTablesPosZones);

declare global {
  interface HTMLElementTagNameMap {
    'erp-tables-pos-zones': ErpTablesPosZones;
  }
}
