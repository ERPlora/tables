import { LitElement, html, css, nothing } from 'lit';
import { state } from 'lit/decorators.js';
import { define } from '@erplora/outfitkit/define';
import '@erplora/outfitkit/ok-inline-feedback';
import '@erplora/outfitkit/ok-data-table';
import type { DataTableColumn, DataTableAction } from '@erplora/outfitkit';
import { createListController, dataTableLabels } from '@erplora/module-sdk';
import type { ListController, ListClient, ListParams, ListPage } from '@erplora/module-sdk';
// Module i18n catalog (ADR-0055): esbuild inlines these JSON files into the WC `dist`.
import esLocale from '../../../locales/es.json';
import enLocale from '../../../locales/en.json';
import { domainMessage } from '../../lib/domain-error';
import { can } from '../../lib/permissions';
const CATALOG: Record<string, unknown> = { es: esLocale, en: enLocale };

// erp-tables-zones — the ZONES view of the `tables` module (navigation entry `zones`, tables#3).
//
// Back-office list of the dining-room sections with their occupancy, the way the market manages
// them (Square "Sections", Toast "Service areas", Lightspeed "Floor plans", Clover / Revel /
// TouchBistro "Sections", Odoo "Floors" in the backend): a list with create / rename / colour /
// order / activate, the tables each zone holds, and delete guarded by a confirmation (the runtime
// refuses to delete a zone that still has tables — the WASM handler asserts it). Create and edit
// share the panel behind the «+» of the table (parity with /employees and inventory categories).
// The floor plan itself (drag & drop) stays in `erp-tables-canvas`.

interface ErploraClientLike extends ListClient {
  query<T = unknown>(name: string, params?: Record<string, unknown>): Promise<T>;
  queryPage<R = unknown>(name: string, params: ListParams): Promise<ListPage<R>>;
  command<T = unknown>(name: string, payload?: Record<string, unknown>): Promise<T>;
  on(event: string, cb: (payload: unknown) => void): () => void;
  hasPermission?(permission: string): boolean;
  locale: string;
  t(catalog: Record<string, unknown>, key: string, params?: Record<string, unknown>): string;
}

interface Zone {
  id: string;
  name: string;
  description: string | null;
  color: string;
  sort_order: number;
  is_active: number;
  table_count: number;
  available_tables_count: number;
}

interface ZoneForm {
  name: string;
  color: string;
  sortOrder: string;
  isActive: boolean;
}

// Zone colour = an Ionic colour token (the migration defaults `color` to `primary`); the list paints
// it as a swatch. A closed domain, so the form offers a select rather than a free text field.
const COLORS = ['primary', 'secondary', 'tertiary', 'success', 'warning', 'danger', 'medium'];
const COLOR_KEY: Record<string, string> = {
  primary: 'ui.colorPrimary',
  secondary: 'ui.colorSecondary',
  tertiary: 'ui.colorTertiary',
  success: 'ui.colorSuccess',
  warning: 'ui.colorWarning',
  danger: 'ui.colorDanger',
  medium: 'ui.colorMedium',
};

function erplora(): ErploraClientLike {
  const c = (globalThis as { erplora?: ErploraClientLike }).erplora;
  if (!c) throw new Error('erplora SDK not initialised by the shell');
  return c;
}

const EMPTY_FORM: ZoneForm = { name: '', color: 'primary', sortOrder: '0', isActive: true };

export class ErpTablesZones extends LitElement {
  static styles = css`
    :host { display:flex; flex-direction:column; height:100%; min-height:0; font-family: system-ui, sans-serif; color: var(--ion-text-color, #1c1b18); }
    .page { display:flex; flex-direction:column; min-height:0; flex:1 1 auto; gap:.75rem; }
    .page > ok-data-table { flex:1 1 auto; min-height:0; }
    .form { display:flex; flex-direction:column; gap:.7rem; }
    .form .foot { display:flex; justify-content:flex-end; gap:.5rem; }
    .swatch { display:inline-block; width:.9rem; height:.9rem; border-radius: var(--ok-radius-pill, 50%); vertical-align:middle; margin-right:.4rem; }
    .off { color: var(--ok-muted, #8b897f); }
  `;

  @state() form: ZoneForm = { ...EMPTY_FORM };

  @state() editingId: string | null = null;

  /** Row being edited: keeps the fields the form does not expose (`description`) on update. */
  private editRow: Zone | null = null;

  @state() deleteTarget: Zone | null = null;

  @state() private saving = false;

  @state() private formError = '';

  private ctrl!: ListController<Zone>;

  private unsub?: () => void;

  private readonly onLocaleChange = (): void => this.requestUpdate();

  get columns(): DataTableColumn[] {
    const t = (k: string, p?: Record<string, unknown>): string => erplora().t(CATALOG, k, p);
    return [
      {
        key: 'name',
        header: t('ui.colName'),
        sortable: true,
        filterable: true,
        filterType: 'text',
        render: (r) => html`<span class="swatch" style=${`background:var(--ion-color-${r.color || 'primary'})`}></span>${r.name as string}`,
      },
      { key: 'table_count', header: t('ui.colTables'), align: 'right', sortable: true, format: (r) => String(r.table_count ?? 0) },
      {
        key: 'available_tables_count',
        header: t('ui.colAvailable'),
        align: 'right',
        sortable: true,
        format: (r) => t('ui.availableOfTotal', { available: r.available_tables_count ?? 0, total: r.table_count ?? 0 }),
      },
      { key: 'sort_order', header: t('ui.colOrder'), align: 'right', sortable: true },
      {
        key: 'is_active',
        header: t('ui.colStatus'),
        sortable: true,
        filterable: true,
        filterType: 'select',
        options: [
          { value: '1', label: t('ui.zoneActive') },
          { value: '0', label: t('ui.zoneInactive') },
        ],
        format: (r) => (Number(r.is_active) ? t('ui.zoneActive') : t('ui.zoneInactive')),
      },
    ];
  }

  get actions(): DataTableAction[] {
    const t = (k: string): string => erplora().t(CATALOG, k);
    return [
      ...(can('tables.change_zone') ? [{ id: 'edit', label: t('ui.actionEdit'), icon: 'create-outline' }] : []),
      ...(can('tables.delete_zone') ? [{ id: 'delete', label: t('ui.actionDelete'), icon: 'trash-outline', color: 'danger' }] : []),
    ];
  }

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('erplora:locale-changed', this.onLocaleChange);
  }

  async firstUpdated(): Promise<void> {
    this.ctrl = createListController<Zone>(erplora(), 'tables.zones.list', () => this.requestUpdate(), {
      pageSize: 50,
      sort: 'sort_order',
      dir: 'asc',
    });
    await this.ctrl.load();
    this.form = { ...EMPTY_FORM, sortOrder: String(this.nextOrder()) };
    try {
      // One subscription per event, literal in the call (ADR-0127). Table events change the counts.
      const offs = [
        erplora().on('tables.zone.created', () => this.ctrl.load()),
        erplora().on('tables.zone.updated', () => this.ctrl.load()),
        erplora().on('tables.zone.deleted', () => this.ctrl.load()),
        erplora().on('tables.table.created', () => this.ctrl.load()),
        erplora().on('tables.table.updated', () => this.ctrl.load()),
        erplora().on('tables.table.deleted', () => this.ctrl.load()),
        erplora().on('tables.session.opened', () => this.ctrl.load()),
        erplora().on('tables.session.closed', () => this.ctrl.load()),
      ];
      this.unsub = () => offs.forEach((o) => o());
    } catch {
      /* preview without SDK */
    }
  }

  disconnectedCallback(): void {
    window.removeEventListener('erplora:locale-changed', this.onLocaleChange);
    this.unsub?.();
    super.disconnectedCallback();
  }

  /** A new zone goes to the end: max(sort_order) + 1 over the loaded page, or the total. */
  private nextOrder(): number {
    const rows = this.ctrl?.rows ?? [];
    const max = rows.reduce((m, z) => Math.max(m, Number(z.sort_order) || 0), -1);
    return Math.max(max + 1, this.ctrl?.total ?? 0);
  }

  private dataTable(): { open(p?: 'filters' | 'create'): void; close(): void } | null {
    return this.renderRoot.querySelector('ok-data-table') as { open(p?: 'filters' | 'create'): void; close(): void } | null;
  }

  async onRowAction(ev: CustomEvent<{ actionId: string; row: Record<string, unknown> }>): Promise<void> {
    const { actionId, row } = ev.detail;
    const z = row as unknown as Zone;
    if (actionId === 'edit' && can('tables.change_zone')) {
      this.editingId = z.id;
      this.editRow = z;
      this.form = { name: z.name, color: z.color || 'primary', sortOrder: String(z.sort_order ?? 0), isActive: Number(z.is_active) === 1 };
      this.formError = '';
      this.dataTable()?.open('create');
    } else if (actionId === 'delete' && can('tables.delete_zone')) {
      // Never delete straight away: the runtime refuses a zone with tables, and even an empty one
      // deserves a confirmation (Lightspeed: "cannot be undone").
      this.deleteTarget = z;
    }
  }

  cancelEdit(): void {
    this.editingId = null;
    this.editRow = null;
    this.form = { ...EMPTY_FORM, sortOrder: String(this.nextOrder()) };
    this.formError = '';
  }

  async submit(ev: Event): Promise<void> {
    ev.preventDefault();
    const name = this.form.name.trim();
    if (!name) return;
    if (!can(this.editingId ? 'tables.change_zone' : 'tables.add_zone')) return;
    this.saving = true;
    this.formError = '';
    try {
      const sortOrder = Math.max(0, Number(this.form.sortOrder) || 0);
      if (this.editingId) {
        await erplora().command('tables.zones.update', {
          zone_id: this.editingId,
          name,
          description: this.editRow?.description ?? '',
          color: this.form.color || 'primary',
          sort_order: sortOrder,
          is_active: this.form.isActive ? 1 : 0,
        });
      } else {
        await erplora().command('tables.zones.create', {
          name,
          description: '',
          color: this.form.color || 'primary',
          sort_order: sortOrder,
        });
      }
      this.cancelEdit();
      this.dataTable()?.close();
      await this.ctrl.load();
    } catch (e) {
      this.formError = domainMessage(e, erplora().locale, erplora().t(CATALOG, 'ui.errSaveZone'));
    } finally {
      this.saving = false;
    }
  }

  async confirmDelete(): Promise<void> {
    if (!this.deleteTarget || !can('tables.delete_zone')) return;
    const target = this.deleteTarget;
    this.saving = true;
    try {
      await erplora().command('tables.zones.delete', { zone_id: target.id });
      await this.ctrl.load();
    } catch (e) {
      // The WASM handler refuses when the zone still has tables (`tables.zone_has_tables`,
      // tables#55). Before that code existed this painted the raw `tables__gate` CHECK violation
      // of Postgres, identical for all three guards of the module.
      this.formError = domainMessage(e, erplora().locale, erplora().t(CATALOG, 'ui.errDeleteZone'));
    } finally {
      this.deleteTarget = null;
      this.saving = false;
    }
  }

  render() {
    const t = (k: string, p?: Record<string, unknown>): string => erplora().t(CATALOG, k, p);
    return html`<div class="page">
      ${this.formError ? html`<ok-inline-feedback data-testid="tables-zones-error" tone="danger" icon="alert-circle-outline">${this.formError}</ok-inline-feedback>` : nothing}
      ${this.ctrl?.error ? html`<ok-inline-feedback data-testid="tables-zones-load-error" tone="danger" icon="alert-circle-outline">${this.ctrl.error}</ok-inline-feedback>` : nothing}

      <ok-data-table
        testid="tables-zones-table"
        .serverSide=${true}
        .fill=${true}
        .labels=${dataTableLabels(erplora().locale)}
        .columns=${this.columns}
        .actions=${this.actions} .rowClickable=${true}
        .addable=${can('tables.add_zone')}
        .views=${true}
        .cardTitle=${(r: Record<string, unknown>) => String(r.name ?? '')}
        .cardIcon=${() => 'layers-outline'}
        .rows=${this.ctrl?.rows ?? []}
        .total=${this.ctrl?.total ?? 0}
        .page=${this.ctrl?.state.page ?? 0}
        .pageSize=${this.ctrl?.state.pageSize ?? 50}
        .sort=${this.ctrl?.state.sort}
        .sortDir=${this.ctrl?.state.dir ?? 'asc'}
        .searchable=${true}
        .searchPlaceholder=${t('ui.searchZone')}
        .emptyMessage=${this.ctrl?.loading ? t('ui.loading') : t('ui.emptyZones')}
        @rowAction=${(e: CustomEvent<{ actionId: string; row: Record<string, unknown> }>) => this.onRowAction(e)} @rowClick=${(e: CustomEvent<{ row: Record<string, unknown> }>) => this.onRowAction({ detail: { actionId: 'edit', row: e.detail.row } } as CustomEvent<{ actionId: string; row: Record<string, unknown> }>)}
        @pageChange=${(e: CustomEvent<number>) => this.ctrl.setPage(e.detail)}
        @pageSizeChange=${(e: CustomEvent<number>) => this.ctrl.setPageSize(e.detail)}
        @sortChange=${(e: CustomEvent<{ sort: string; dir: 'asc' | 'desc' }>) => this.ctrl.setSort(e.detail.sort, e.detail.dir)}
        @searchChange=${(e: CustomEvent<string>) => this.ctrl.setSearch(e.detail)}
        @filterChange=${(e: CustomEvent<{ col: string; value: unknown }>) => this.ctrl.setFilter(e.detail.col, e.detail.value)}
      >
        <!-- Create / edit: always projected (the «+» must never open an empty panel). -->
        <form slot="create" class="form" data-testid="tables-zones-form" @submit=${(e: Event) => this.submit(e)}>
          <ion-input data-testid="tables-zones-name" mode="md" fill="outline" label-placement="floating" label=${t('ui.colName')} .value=${this.form.name}
            @ionInput=${(e: Event) => (this.form = { ...this.form, name: (e.target as HTMLInputElement).value || '' })}></ion-input>
          <ion-select data-testid="tables-zones-color" mode="md" fill="outline" label-placement="floating" label=${t('ui.colColor')} interface="popover" .value=${this.form.color}
            @ionChange=${(e: CustomEvent) => (this.form = { ...this.form, color: (e.detail as { value: string }).value || 'primary' })}>
            ${COLORS.map((c) => html`<ion-select-option value=${c}>${t(COLOR_KEY[c])}</ion-select-option>`)}
          </ion-select>
          <ion-input data-testid="tables-zones-order" mode="md" fill="outline" label-placement="floating" label=${t('ui.colOrder')} type="number" min="0" .value=${this.form.sortOrder}
            @ionInput=${(e: Event) => (this.form = { ...this.form, sortOrder: (e.target as HTMLInputElement).value || '0' })}></ion-input>
          ${this.editingId
            ? html`<ion-toggle data-testid="tables-zones-active" .checked=${this.form.isActive} @ionChange=${(e: CustomEvent) => (this.form = { ...this.form, isActive: !!(e.detail as { checked: boolean }).checked })}>${t('ui.zoneActive')}</ion-toggle>`
            : nothing}
          <div class="foot">
            ${this.editingId ? html`<ion-button data-testid="tables-zones-cancel" fill="clear" @click=${() => this.cancelEdit()}>${t('ui.cancel')}</ion-button>` : nothing}
            <ion-button data-testid="tables-zones-submit" type="submit" ?disabled=${this.saving || !this.form.name.trim()}>
              ${this.saving ? t('ui.saving') : this.editingId ? t('ui.saveChanges') : t('ui.addZone')}
            </ion-button>
          </div>
        </form>
      </ok-data-table>

      <!-- Delete confirmation. ion-modal reparents to <body>: Ionic classes only, no shadow CSS. -->
      <ion-modal data-testid="tables-zones-delete-modal" .isOpen=${!!this.deleteTarget} @ionModalDidDismiss=${() => (this.deleteTarget = null)}>
        <ion-header class="ion-no-border"><ion-toolbar><ion-title>${t('ui.deleteZoneTitle')}</ion-title></ion-toolbar></ion-header>
        <ion-content class="ion-padding">
          <ion-list lines="none">
            <ion-item><ion-label class="ion-text-wrap">
              <b>${this.deleteTarget?.name ?? ''}</b> — ${t('ui.deleteZoneImpact', { count: this.deleteTarget?.table_count ?? 0 })}
            </ion-label></ion-item>
          </ion-list>
          <!-- tables#55: the dialog already knows the zone has tables — it says so, with the
               number, right above, out of the count tables.zones.list returns. Offering the
               destructive action anyway is what tables#14 fixed for the POS blocked table. -->
          <ion-button data-testid="tables-zones-delete-confirm" class="ion-margin-top" expand="block" color="danger"
            ?disabled=${this.saving || (this.deleteTarget?.table_count ?? 0) > 0}
            @click=${() => this.confirmDelete()}>${t('ui.deleteZone')}</ion-button>
          <ion-button data-testid="tables-zones-delete-cancel" expand="block" fill="outline" @click=${() => (this.deleteTarget = null)}>${t('ui.cancel')}</ion-button>
        </ion-content>
      </ion-modal>
    </div>`;
  }
}

define('erp-tables-zones', ErpTablesZones);

declare global {
  interface HTMLElementTagNameMap {
    'erp-tables-zones': ErpTablesZones;
  }
}
