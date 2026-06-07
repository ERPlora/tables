import { LitElement, html, css, nothing } from 'lit';
import { state } from 'lit/decorators.js';
import { define } from '@erplora/outfitkit/define';
import '@erplora/outfitkit/ok-data-table';
import type { DataTableColumn } from '@erplora/outfitkit';
import { createListController } from '@erplora/module-sdk';
import type { ListController, ListClient, ListParams, ListPage } from '@erplora/module-sdk';

interface ErploraClientLike extends ListClient {
  query<T = unknown>(name: string, params?: Record<string, unknown>): Promise<T>;
  queryPage<R = unknown>(name: string, params: ListParams): Promise<ListPage<R>>;
  command<T = unknown>(name: string, payload?: Record<string, unknown>): Promise<T>;
  on(event: string, cb: (payload: unknown) => void): () => void;
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

const STATUS_LABELS: Record<string, string> = {
  available: 'Disponible',
  occupied: 'Ocupada',
  reserved: 'Reservada',
  blocked: 'Bloqueada',
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

  private columns: DataTableColumn[] = [
    { key: 'number', header: 'Número', sortable: true, filterable: true, filterType: 'text' },
    { key: 'name', header: 'Nombre', sortable: true, filterable: true, filterType: 'text', format: (r) => (r.name as string) || '—' },
    { key: 'zone', header: 'Zona', sortable: true, filterable: true, filterType: 'text', format: (r) => (r.zone as string) || '—' },
    { key: 'capacity', header: 'Aforo', align: 'right', sortable: true, filterable: true, filterType: 'text', format: (r) => `${r.capacity} pax` },
    {
      key: 'status',
      header: 'Estado',
      sortable: true,
      filterable: true,
      filterType: 'select',
      options: Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
      format: (r) => STATUS_LABELS[r.status as string] ?? (r.status as string),
    },
  ];

  // TODO-LIT: componentWillLoad → connectedCallback. Recuerda: connectedCallback se dispara
  // en CADA reconexión al DOM (no solo en el primer montaje). Si la init debe correr una
  // sola vez tras el primer render, considera firstUpdated() en su lugar.
  async connectedCallback() {
    super.connectedCallback();
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
      this.formError = e instanceof Error ? e.message : 'No se pudo crear la mesa';
    } finally {
      this.saving = false;
    }
  }

  render() {
    return html`<div>
        <header>
          <h2>Plano de sala</h2>
        </header>
        <form class="form" @submit=${(e) => this.createTable(e)}>
          <ion-input placeholder="Número" .value=${this.newNumber} @ionInput=${(e: any) => (this.newNumber = e.target.value)}></ion-input>
          <ion-input type="number" min="1" placeholder="Aforo" .value=${this.newCapacity} @ionInput=${(e: any) => (this.newCapacity = e.target.value)}></ion-input>
          <ion-button type="submit" size="small" ?disabled=${this.saving || !this.newNumber}>${this.saving ? 'Guardando…' : 'Añadir mesa'}</ion-button>
        </form>
        ${this.formError ? html`<p class="err">${this.formError}</p>` : nothing}
        ${this.ctrl?.error ? html`<p class="err">${this.ctrl.error}</p>` : nothing}
        <ok-data-table .serverSide=${true} .columns=${this.columns} .rows=${this.ctrl?.rows ?? []} .total=${this.ctrl?.total ?? 0} .page=${this.ctrl?.state.page ?? 0} .pageSize=${this.ctrl?.state.pageSize ?? 50} .sort=${this.ctrl?.state.sort} .sortDir=${this.ctrl?.state.dir ?? 'asc'} .searchable=${true} .searchPlaceholder=${"Buscar mesa o zona…"} .emptyMessage=${this.ctrl?.loading ? 'Cargando…' : 'Sin mesas.'} @pageChange=${(e: CustomEvent<number>) => this.ctrl.setPage(e.detail)} @sortChange=${(e: CustomEvent<{ sort: string; dir: 'asc' | 'desc' }>) => this.ctrl.setSort(e.detail.sort, e.detail.dir)} @searchChange=${(e: CustomEvent<string>) => this.ctrl.setSearch(e.detail)} @filterChange=${(e: CustomEvent<{ col: string; value: unknown }>) => this.ctrl.setFilter(e.detail.col, e.detail.value)}></ok-data-table>
      </div>`;
  }
}

define('erp-tables-floor-plan', ErpTablesFloorPlan);
