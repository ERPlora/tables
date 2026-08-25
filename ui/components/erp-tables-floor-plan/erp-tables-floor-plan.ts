import { LitElement, html, css, nothing } from 'lit';
import { state } from 'lit/decorators.js';
import { define } from '@erplora/outfitkit/define';
import '@erplora/outfitkit/ok-inline-feedback';
import '@erplora/outfitkit/ok-data-table';
import type { DataTableColumn } from '@erplora/outfitkit';
import { createListController } from '@erplora/module-sdk';
import type { ListController, ListClient, ListParams, ListPage } from '@erplora/module-sdk';
// Catálogo i18n del módulo (ADR-0055): esbuild inlinea estos JSON en el `dist` del WC. Los textos
// internos se resuelven con `erplora.t(CATALOG, 'ui.clave')` (idioma activo, fallback locale→en→clave).
import esLocale from '../../../locales/es.json';
import enLocale from '../../../locales/en.json';
import { domainMessage } from '../../lib/domain-error';
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

interface Zone {
  id: string;
  name: string;
}

// Estado → clave i18n (el `value=` del enum NO se traduce; sí su etiqueta visible).
const STATUS_KEY: Record<string, string> = {
  available: 'ui.statusAvailable',
  occupied: 'ui.statusOccupied',
  reserved: 'ui.statusReserved',
  blocked: 'ui.statusBlocked',
};

// tables#182 — the column the user reads (`number`) is not the column the server orders by. The
// natural key lives in the query as `number_sort`; the table keeps showing (and marking) `number`.
const SORT_KEY: Record<string, string> = { number: 'number_sort' };

/** Column key → the key the server sorts by. */
const toServerSort = (col: string): string => SORT_KEY[col] ?? col;

/** The reverse, so `ok-data-table` paints its arrow on the column that is actually visible. */
const toColumnSort = (sort?: string): string | undefined =>
  Object.keys(SORT_KEY).find((col) => SORT_KEY[col] === sort) ?? sort;

function erplora(): ErploraClientLike {
  const c = (globalThis as { erplora?: ErploraClientLike }).erplora;
  if (!c) throw new Error('erplora SDK no inicializado por el shell');
  return c;
}

export class ErpTablesFloorPlan extends LitElement {
  static styles = css`
    :host { display:flex; flex-direction:column; height:100%; min-height:0; font-family: system-ui, sans-serif; color: var(--ion-text-color, #1c1b18); }
    /* La vista llena el alto: el data-table ocupa todo (scroll interno, pie fijo). */
    .page { display:flex; flex-direction:column; min-height:0; flex:1 1 auto; }
    .page > ok-data-table { flex:1 1 auto; min-height:0; }
    /* El alta vive en el panel lateral de la tabla (estrecho) → campos en columna, no en fila. */
    .form { display:flex; flex-direction:column; gap:.7rem; }
    .form ion-button { align-self:flex-end; }
    .err { color:#d9480f; font-weight:600; }
  `;

  @state() newNumber = '';

  @state() newCapacity = '4';

  /** Zone chosen in the create form ('' = no zone). tables#3: it used to be hardcoded to null. */
  @state() newZoneId = '';

  @state() saving = false;

  @state() formError = '';

  @state() tick = 0;

  /** Zonas REALES del hub: pueblan el select del filtro de zona (el servidor filtra `zone` por `eq`
   *  sobre el NOMBRE de la zona, no por su id). */
  @state() private zones: Zone[] = [];

  private ctrl!: ListController<Table>;

  private unsub?: () => void;

  // Getter (no campo): se re-evalúa en cada render, así los textos cambian con el idioma activo
  // (ADR-0055). `connectedCallback` re-renderiza al recibir `erplora:locale-changed`.
  private get columns(): DataTableColumn[] {
    const t = (k: string, params?: Record<string, unknown>): string => erplora().t(CATALOG, k, params);
    return [
      { key: 'number', header: t('ui.colNumber'), sortable: true, filterable: true, filterType: 'text' },
      { key: 'name', header: t('ui.colName'), sortable: true, filterable: true, filterType: 'text', format: (r) => (r.name as string) || '—' },
      {
        key: 'zone',
        header: t('ui.colZone'),
        sortable: true,
        filterable: true,
        // Dominio cerrado: las zonas que existen en el hub. Tecleando el nombre a mano, un acento o
        // una mayúscula de más («salon» por «Salón») dejaba la lista vacía sin decir por qué.
        filterType: 'select',
        options: this.zones.map((z) => ({ value: z.name, label: z.name })),
        format: (r) => (r.zone as string) || '—',
      },
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
      // tables#182: NATURAL order, the same the POS picker paints — `S2` before `S10`, and a named
      // table (`Terraza A`) alphabetical. The list is paginated by the SERVER, so the order is
      // decided by the key we ask for; reordering the visible page here would sort each page on
      // its own and still cut the pages by the wrong key.
      sort: SORT_KEY.number,
      dir: 'asc',
    });
    await this.ctrl.load();
    await this.loadZones();
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

  // Best-effort: si las zonas no cargan, el filtro de zona queda sin opciones pero la lista de mesas
  // sigue funcionando (una mesa sin zona es válida: `zone_id` es nullable).
  private async loadZones(): Promise<void> {
    try {
      // `queryAll`, no `query`: el select del filtro quiere TODAS las zonas. `query` sobre una query
      // de lista devuelve solo la PRIMERA página (50) y se calla — ADR-0124. Coherente con lo que
      // ya hacen erp-tables-canvas y erp-tables-pos-zones.
      const rows = await erplora().queryAll<Zone>('tables.zones.list', { sort: 'sort_order', dir: 'asc' });
      this.zones = Array.isArray(rows) ? rows : [];
    } catch {
      this.zones = [];
    }
  }

  // Referencia al ok-data-table para cerrar su panel lateral (drawer) tras el alta.
  private dataTable(): { open(p?: 'filters' | 'create'): void; close(): void } | null {
    return this.renderRoot.querySelector('ok-data-table') as
      | { open(p?: 'filters' | 'create'): void; close(): void }
      | null;
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
        zone_id: this.newZoneId || null,
        shape: 'square',
        position_x: 0,
        position_y: 0,
        width: 10,
        height: 10,
      });
      this.newNumber = '';
      this.newCapacity = '4';
      this.dataTable()?.close(); // si no, el panel se queda abierto tapando la mesa recién creada
      await this.ctrl.load(); // (además del evento; garantiza refresco inmediato)
    } catch (e) {
      this.formError = domainMessage(e, erplora().locale, erplora().t(CATALOG, 'ui.errCreateTable'));
    } finally {
      this.saving = false;
    }
  }

  // El título de la vista lo pinta el topbar del shell: repetirlo aquí lo duplicaba en pantalla.
  render() {
    const t = (k: string, params?: Record<string, unknown>): string => erplora().t(CATALOG, k, params);
    return html`<div class="page">
        ${this.formError ? html`<ok-inline-feedback tone="danger" icon="alert-circle-outline">${this.formError}</ok-inline-feedback>` : nothing}
        ${this.ctrl?.error ? html`<ok-inline-feedback tone="danger" icon="alert-circle-outline">${this.ctrl.error}</ok-inline-feedback>` : nothing}
        <ok-data-table .serverSide=${true} .fill=${true} .addable=${true} .columns=${this.columns} .views=${true} .cardTitle=${(r: Record<string, unknown>) => String(r.name || r.number || '—')} .cardIcon=${() => 'grid-outline'} .rows=${this.ctrl?.rows ?? []} .total=${this.ctrl?.total ?? 0} .page=${this.ctrl?.state.page ?? 0} .pageSize=${this.ctrl?.state.pageSize ?? 50} .sort=${toColumnSort(this.ctrl?.state.sort)} .sortDir=${this.ctrl?.state.dir ?? 'asc'} .searchable=${true} .searchPlaceholder=${t('ui.searchPlaceholder')} .emptyMessage=${this.ctrl?.loading ? t('ui.loading') : t('ui.emptyTables')} @pageChange=${(e: CustomEvent<number>) => this.ctrl.setPage(e.detail)} @pageSizeChange=${(e: CustomEvent<number>) => this.ctrl.setPageSize(e.detail)} @sortChange=${(e: CustomEvent<{ sort: string; dir: 'asc' | 'desc' }>) => this.ctrl.setSort(toServerSort(e.detail.sort), e.detail.dir)} @searchChange=${(e: CustomEvent<string>) => this.ctrl.setSearch(e.detail)} @filterChange=${(e: CustomEvent<{ col: string; value: unknown }>) => this.ctrl.setFilter(e.detail.col, e.detail.value)}>
          <!-- Alta de mesa: se proyecta SIEMPRE (aunque el panel esté cerrado); si se renderizara
               solo con el panel abierto, el «+» de la barra abriría un panel vacío. -->
          <form slot="create" class="form" @submit=${(e: Event) => this.createTable(e)}>
            <ion-input mode="md" fill="outline" label-placement="floating" label=${t('ui.colNumber')} .value=${this.newNumber} @ionInput=${(e: any) => (this.newNumber = e.target.value)}></ion-input>
            <ion-input mode="md" fill="outline" label-placement="floating" label=${t('ui.colCapacity')} type="number" min="1" .value=${this.newCapacity} @ionInput=${(e: any) => (this.newCapacity = e.target.value)}></ion-input>
            <ion-select mode="md" fill="outline" label-placement="floating" label=${t('ui.fieldZone')} interface="popover" .value=${this.newZoneId} @ionChange=${(e: CustomEvent) => (this.newZoneId = (e.detail as { value: string }).value || '')}>
              <ion-select-option value="">${t('ui.noZone')}</ion-select-option>
              ${this.zones.map((z) => html`<ion-select-option value=${z.id}>${z.name}</ion-select-option>`)}
            </ion-select>
            <ion-button type="submit" ?disabled=${this.saving || !this.newNumber}>${this.saving ? t('ui.saving') : t('ui.addTable')}</ion-button>
          </form>
        </ok-data-table>
      </div>`;
  }
}

define('erp-tables-floor-plan', ErpTablesFloorPlan);
