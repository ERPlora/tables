import { LitElement, html, css, nothing } from 'lit';
import { state } from 'lit/decorators.js';
import { define } from '@erplora/outfitkit/define';
import '@erplora/outfitkit/ok-data-table';
import type { DataTableColumn } from '@erplora/outfitkit';
import { createListController } from '@erplora/module-sdk';
import type { ListController, ListClient, ListParams, ListPage } from '@erplora/module-sdk';
// Catálogo i18n del módulo (ADR-0055): esbuild inlinea estos JSON en el `dist` del WC. Los textos
// internos se resuelven con `erplora.t(CATALOG, 'ui.clave')` (idioma activo, fallback locale→en→clave).
import esLocale from '../../../locales/es.json';
import enLocale from '../../../locales/en.json';
const CATALOG: Record<string, unknown> = { es: esLocale, en: enLocale };

interface ErploraClientLike extends ListClient {
  query<T = unknown>(name: string, params?: Record<string, unknown>): Promise<T>;
  queryPage<R = unknown>(name: string, params: ListParams): Promise<ListPage<R>>;
  command<T = unknown>(name: string, payload?: Record<string, unknown>): Promise<T>;
  on(event: string, cb: (payload: unknown) => void): () => void;
  /** i18n del módulo (ADR-0055): idioma activo + traducción del catálogo `ui`. */
  locale: string;
  t(catalog: Record<string, unknown>, key: string, params?: Record<string, unknown>): string;
}

interface Table {
  id: string;
  number: string;
  name: string;
  capacity: number;
  shape: string;
  status: string;
  is_active: number;
  zone: string | null;
  zone_id: string | null;
}

// Estado → clave i18n (el `value=` del enum NO se traduce; sí su etiqueta visible).
const STATUS_KEY: Record<string, string> = {
  available: 'ui.statusAvailable',
  occupied: 'ui.statusOccupied',
  reserved: 'ui.statusReserved',
  blocked: 'ui.statusBlocked',
};

function erplora(): ErploraClientLike {
  const c = (globalThis as { erplora?: ErploraClientLike }).erplora;
  if (!c) throw new Error('erplora SDK no inicializado por el shell');
  return c;
}

export class ErpTablesFloorPlan extends LitElement {
  static styles = css`
    :host { display:block; font-family: system-ui, sans-serif; color: var(--ion-text-color, #1c1b18); }
    header { display:flex; gap:.5rem; align-items:center; margin-bottom:.75rem; }
    h2 { margin:0; font-size:1.15rem; flex:1; }
    .form { display:flex; gap:.5rem; flex-wrap:wrap; align-items:end; margin:.5rem 0 1rem; }
    .form ion-input { --background:var(--surface-2,#f7f4ec); border:1px solid var(--line,#e7e2d6); border-radius:8px; min-width:8rem; }
    .err { color:#d9480f; font-weight:600; }
  `;

  @state() newNumber = '';

  @state() newCapacity = '4';

  @state() saving = false;

  @state() formError = '';

  @state() tick = 0;

  private ctrl!: ListController<Table>;

  private unsub?: () => void;

  // Getter (no campo): se re-evalúa en cada render, así los textos cambian con el idioma activo
  // (ADR-0055). `connectedCallback` re-renderiza al recibir `erplora:locale-changed`.
  private get columns(): DataTableColumn[] {
    const t = (k: string, params?: Record<string, unknown>): string => erplora().t(CATALOG, k, params);
    return [
      { key: 'number', header: t('ui.colNumber'), sortable: true, filterable: true, filterType: 'text' },
      { key: 'name', header: t('ui.colName'), sortable: true, filterable: true, filterType: 'text', format: (r) => (r.name as string) || '—' },
      { key: 'zone', header: t('ui.colZone'), sortable: true, filterable: true, filterType: 'text', format: (r) => (r.zone as string) || '—' },
      { key: 'capacity', header: t('ui.colCapacity'), align: 'right', sortable: true, filterable: true, filterType: 'text', format: (r) => t('ui.paxCount', { count: r.capacity }) },
      {
        key: 'status',
        header: t('ui.colStatus'),
        sortable: true,
        filterable: true,
        filterType: 'select',
        options: Object.entries(STATUS_KEY).map(([value, k]) => ({ value, label: t(k) })),
        format: (r) => (STATUS_KEY[r.status as string] ? t(STATUS_KEY[r.status as string]) : (r.status as string)),
      },
    ];
  }

  // Re-render al cambiar el idioma del shell (ADR-0055): el getter `columns` y los textos del
  // template se re-evalúan con el nuevo `erplora.locale`.
  private readonly onLocaleChange = (): void => this.requestUpdate();

  // TODO-LIT: componentWillLoad → connectedCallback. Recuerda: connectedCallback se dispara
  // en CADA reconexión al DOM (no solo en el primer montaje). Si la init debe correr una
  // sola vez tras el primer render, considera firstUpdated() en su lugar.
  async connectedCallback() {
    super.connectedCallback();
    window.addEventListener('erplora:locale-changed', this.onLocaleChange);
    this.ctrl = createListController<Table>(erplora(), 'tables.tables.list', () => this.requestUpdate(), {
      pageSize: 50,
      sort: 'name',
      dir: 'asc',
    });
    await this.ctrl.load();
    // Reactividad: recargamos cuando el runtime emite eventos de dominio.
    try {
      const offs = [
        erplora().on('tables.table.created', () => this.ctrl.load()),
        erplora().on('tables.table.updated', () => this.ctrl.load()),
        erplora().on('tables.table.deleted', () => this.ctrl.load()),
        erplora().on('tables.session.opened', () => this.ctrl.load()),
        erplora().on('tables.session.closed', () => this.ctrl.load()),
        erplora().on('tables.session.transferred', () => this.ctrl.load()),
      ];
      this.unsub = () => offs.forEach((o) => o());
    } catch {
      /* sin SDK (preview) → sin reactividad en vivo */
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('erplora:locale-changed', this.onLocaleChange);
    this.unsub?.();
  }

  private async createTable(ev: Event) {
    ev.preventDefault();
    if (!this.newNumber.trim()) return;
    this.saving = true;
    this.formError = '';
    try {
      await erplora().command('tables.tables.create', {
        number: this.newNumber.trim(),
        name: '',
        capacity: Number(this.newCapacity) || 4,
        zone_id: null,
        shape: 'square',
        position_x: 0,
        position_y: 0,
        width: 10,
        height: 10,
      });
      this.newNumber = '';
      this.newCapacity = '4';
      await this.ctrl.load(); // (además del evento; garantiza refresco inmediato)
    } catch (e) {
      this.formError = e instanceof Error ? e.message : erplora().t(CATALOG, 'ui.errCreateTable');
    } finally {
      this.saving = false;
    }
  }

  render() {
    const t = (k: string, params?: Record<string, unknown>): string => erplora().t(CATALOG, k, params);
    return html`<div>
        <header>
          <h2>${t('ui.floorPlan')}</h2>
        </header>
        <form class="form" @submit=${(e) => this.createTable(e)}>
          <ion-input placeholder=${t('ui.placeholderNumber')} .value=${this.newNumber} @ionInput=${(e: any) => (this.newNumber = e.target.value)}></ion-input>
          <ion-input type="number" min="1" placeholder=${t('ui.placeholderCapacity')} .value=${this.newCapacity} @ionInput=${(e: any) => (this.newCapacity = e.target.value)}></ion-input>
          <ion-button type="submit" size="small" ?disabled=${this.saving || !this.newNumber}>${this.saving ? t('ui.saving') : t('ui.addTable')}</ion-button>
        </form>
        ${this.formError ? html`<p class="err">${this.formError}</p>` : nothing}
        ${this.ctrl?.error ? html`<p class="err">${this.ctrl.error}</p>` : nothing}
        <ok-data-table .serverSide=${true} .columns=${this.columns} .rows=${this.ctrl?.rows ?? []} .total=${this.ctrl?.total ?? 0} .page=${this.ctrl?.state.page ?? 0} .pageSize=${this.ctrl?.state.pageSize ?? 50} .sort=${this.ctrl?.state.sort} .sortDir=${this.ctrl?.state.dir ?? 'asc'} .searchable=${true} .searchPlaceholder=${t('ui.searchPlaceholder')} .emptyMessage=${this.ctrl?.loading ? t('ui.loading') : t('ui.emptyTables')} @pageChange=${(e: CustomEvent<number>) => this.ctrl.setPage(e.detail)} @sortChange=${(e: CustomEvent<{ sort: string; dir: 'asc' | 'desc' }>) => this.ctrl.setSort(e.detail.sort, e.detail.dir)} @searchChange=${(e: CustomEvent<string>) => this.ctrl.setSearch(e.detail)} @filterChange=${(e: CustomEvent<{ col: string; value: unknown }>) => this.ctrl.setFilter(e.detail.col, e.detail.value)}></ok-data-table>
      </div>`;
  }
}

define('erp-tables-floor-plan', ErpTablesFloorPlan);
