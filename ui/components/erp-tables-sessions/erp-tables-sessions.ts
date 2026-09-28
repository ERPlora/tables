import { LitElement, html, css, nothing } from 'lit';
import { ionTone } from '../../lib/ion-tone';
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

// erp-tables-sessions — the SESSIONS view of the `tables` module (navigation entry `sessions`,
// tables#3 b): the checks of the room as the market lists them (Toast "All checks" with its
// open / paid / closed tabs, Square "Orders", Odoo orders per floor). A session is opened from the
// POS when a party sits down (there is no «+» here); this screen is for the manager: what is open
// right now, on which zone, with how many covers and for how long — plus the history. Per row:
// detail, and «close» on an active session (→ `tables.sessions.close`, after confirming).
//
// `duration` is derived in the UI from `opened_at` / `closed_at` (tables#4): the query does not
// store it, and an open check keeps counting while the screen is on.

interface ErploraClientLike extends ListClient {
  query<T = unknown>(name: string, params?: Record<string, unknown>): Promise<T>;
  queryAll<T = unknown>(name: string, params?: Record<string, unknown>): Promise<T[]>;
  queryPage<R = unknown>(name: string, params: ListParams): Promise<ListPage<R>>;
  command<T = unknown>(name: string, payload?: Record<string, unknown>): Promise<T>;
  on(event: string, cb: (payload: unknown) => void): () => void;
  hasPermission?(permission: string): boolean;
  locale: string;
  /** The hub's resolved IANA zone (hub#1022): the business clock every time on screen reads. */
  timezone?: string;
  /** Cents → the hub's currency (ADR-0055): divides by the currency's own decimals, never /100 blindly. */
  formatMoney(minor: number, opts?: { currency?: string; locale?: string }): string;
  t(catalog: Record<string, unknown>, key: string, params?: Record<string, unknown>): string;
}

interface Session {
  id: string;
  table_id: string | null;
  table_number: string | null;
  guests_count: number;
  status: string;
  waiter_id: string | null;
  opened_at: string;
  closed_at: string | null;
  notes: string;
  order_id: string | null;
  split_from_id: string | null;
  zone_id: string | null;
  zone: string | null;
  /** tables#96 · cents the check's order charged (its sales minus the voided ones); NULL = nothing yet. */
  paid_total: number | null;
}

interface Zone {
  id: string;
  name: string;
}

/** One row of `hub.users.list` — the hub's people (ADR-0192, the core's reserved namespace).
 *  Personnel belongs to the CORE, not to the `staff` module: the same door the KDS card
 *  (kitchen#63) and the printed chit already use to put a name on a `waiter_id`. */
interface HubUser {
  id: string;
  name: string;
}

// Session states written by the command chains (`_session_*.sql`). The `value` is the enum, the
// label is translated.
const STATUSES = ['active', 'closed', 'transferred', 'merged', 'parked'];
const STATUS_KEY: Record<string, string> = {
  active: 'ui.sessionActive',
  closed: 'ui.sessionClosed',
  transferred: 'ui.sessionTransferred',
  merged: 'ui.sessionMerged',
  parked: 'ui.sessionParked',
};

/** Segment above the table, Toast-style: Open · Closed · All. `''` = no status filter. */
const SEGMENTS: { id: string; status: string; key: string }[] = [
  { id: 'open', status: 'active', key: 'ui.segmentOpen' },
  { id: 'closed', status: 'closed', key: 'ui.segmentClosed' },
  { id: 'all', status: '', key: 'ui.segmentAll' },
];

const REFRESH_MS = 30_000; // the duration column keeps counting on an open check

/** Room settings (tables#3 c). Defaults mirror `schemas/settings_update.json`: a hub that never
 *  saved anything behaves like the schema says. */
interface RoomSettings {
  timer_warning_minutes: number;
  timer_critical_minutes: number;
}
const DEFAULT_SETTINGS: RoomSettings = { timer_warning_minutes: 60, timer_critical_minutes: 90 };

function erplora(): ErploraClientLike {
  const c = (globalThis as { erplora?: ErploraClientLike }).erplora;
  if (!c) throw new Error('erplora SDK not initialised by the shell');
  return c;
}

/**
 * The business clock: the hub's IANA zone the shell publishes as `erplora.timezone` (hub#1212,
 * the same one appointments, reservations and whatsapp_inbox read). Never the device's zone: a
 * tablet left on another zone must not move tonight's checks by hours. Absent or unreadable →
 * `UTC`, like the runtime's own degradation; `Intl` would otherwise throw on every render.
 */
function businessZone(): string {
  const tz = erplora().timezone;
  const zone = typeof tz === 'string' && tz.trim() ? tz.trim() : 'UTC';
  try {
    new Intl.DateTimeFormat('en', { timeZone: zone });
    return zone;
  } catch {
    return 'UTC';
  }
}

/**
 * `2026-08-18T20:15:00Z` → the business wall clock in the hub language (`20:15` / `8:15 PM`).
 * tables#101: «Closed» and «All» are not limited to tonight, so a time from another business day
 * carries its date (`17 ago, 19:30`) and one from another year its year — the time alone would
 * pass last week's check off as tonight's.
 */
function clockTime(iso: string | null | undefined, now: Date): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const timeZone = businessZone();
  const dayOf = (x: Date) => new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(x);
  const day = dayOf(d);
  const today = dayOf(now);
  const opts: Intl.DateTimeFormatOptions = day === today
    ? { hour: 'numeric', minute: '2-digit' }
    : { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', ...(day.slice(0, 4) !== today.slice(0, 4) ? { year: 'numeric' } : {}) };
  return new Intl.DateTimeFormat(erplora().locale || undefined, { ...opts, timeZone }).format(d);
}

/**
 * tables#96 · what a check charged, in the hub's currency — or «—» when nothing was charged (an
 * open check, or a sale older than the ledger). Never «0,00»: an empty check did not charge zero,
 * it has not been charged.
 */
function paidAmount(paid: unknown): string {
  if (paid == null || paid === '') return '—';
  const minor = Number(paid);
  return Number.isFinite(minor) ? erplora().formatMoney(minor) : '—';
}

/** Grid floor of the opening/closing columns: fits «27 sept, 21:40» / «Sep 27, 9:40 PM». */
const TIME_WIDTH = 'minmax(8.5rem,1fr)';

/** Whole minutes between `opened_at` and `closed_at` (or `now` for an open check). */
export function durationMinutes(s: { opened_at: string; closed_at: string | null }, now: Date): number {
  const from = new Date(s.opened_at).getTime();
  const to = s.closed_at ? new Date(s.closed_at).getTime() : now.getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.max(0, Math.floor((to - from) / 60_000));
}

export class ErpTablesSessions extends LitElement {
  static styles = css`
    :host { display:flex; flex-direction:column; height:100%; min-height:0; font-family: system-ui, sans-serif; color: var(--ion-text-color, #1c1b18); }
    .page { display:flex; flex-direction:column; min-height:0; flex:1 1 auto; gap:.6rem; }
    .page > ok-data-table { flex:1 1 auto; min-height:0; }
    ion-segment { max-width: 28rem; }
    /* Segment buttons are touch targets: 44px minimum. */
    ion-segment-button { min-height: 44px; }
    .muted { color: var(--ok-muted, #8b897f); }
    /* Square paints the same two thresholds on its floor plan: amber, then red. */
    .tone-warning { color: var(--ion-color-warning, #f08c00); font-weight: 600; }
    .tone-critical { color: var(--ion-color-danger, #d9480f); font-weight: 700; }
  `;

  /** Injectable clock (tests pin it); the duration column reads it. */
  now: () => Date = () => new Date();

  @state() segment = 'open';

  @state() private zones: Zone[] = [];

  /** tables#74 · id → name of the hub's people, to turn `waiter_id` into a person. */
  @state() private waiters: HubUser[] = [];

  @state() private settings: RoomSettings = { ...DEFAULT_SETTINGS };

  @state() detail: Session | null = null;

  @state() closeTarget: Session | null = null;

  @state() private saving = false;

  @state() private error = '';

  private ctrl!: ListController<Session>;

  private unsub?: () => void;

  private timer?: ReturnType<typeof setInterval>;

  private readonly onLocaleChange = (): void => this.requestUpdate();

  get columns(): DataTableColumn[] {
    const t = (k: string, p?: Record<string, unknown>): string => erplora().t(CATALOG, k, p);
    return [
      { key: 'table_number', header: t('ui.colTable'), sortable: true, filterable: true, filterType: 'text', format: (r) => (r.table_number as string) || t('ui.noTable') },
      {
        // tables#96: the check says what it CHARGED, never the order's internal id (a code nobody can
        // act on). Hidden on «Open»: nothing is charged while the party sits; on «Closed» and «All»
        // it is a visible column, so the phone cards carry it too. Right after the table: as the last
        // column it fell past the right edge of a 768 px tablet.
        key: 'paid_total',
        header: t('ui.colPaidTotal'),
        align: 'right',
        sortable: true,
        hidden: this.segment === 'open',
        format: (r) => paidAmount(r.paid_total),
      },
      // tables#101: when the check closed, right after what it charged (Toast «Closed checks»): next
      // to «Opened» it fell under the pinned actions at 768 px. Hidden on «Open» only, where it
      // always reads «—».
      { key: 'closed_at', header: t('ui.colClosedAt'), sortable: true, hidden: this.segment === 'open', width: TIME_WIDTH, format: (r) => clockTime(r.closed_at as string | null, this.now()) },
      {
        key: 'zone',
        header: t('ui.colZone'),
        sortable: true,
        filterable: true,
        // Closed domain: the zones of the hub. The server filters `zone_id` by `eq`; the column
        // shows the name and the select sends the id — see `onFilterChange`.
        filterType: 'select',
        options: this.zones.map((z) => ({ value: z.id, label: z.name })),
        format: (r) => (r.zone as string) || '—',
      },
      {
        // tables#74: whose check this is. `waiter_id` has travelled on the session since tables#70
        // and the screen threw it away, so with several checks open nobody could tell them apart.
        key: 'waiter_id',
        header: t('ui.colWaiter'),
        // Sorting by an opaque id would order the list by nothing a human can read.
        sortable: false,
        filterable: true,
        // Closed domain: the people of the hub. The column shows the name, the select sends the id
        // — the `waiter_id(eq)` filter the manifest already declares («show me my checks»).
        filterType: 'select',
        options: this.waiters.map((u) => ({ value: u.id, label: u.name })),
        format: (r) => this.waiterName(r.waiter_id) || '—',
      },
      { key: 'guests_count', header: t('ui.colGuests'), align: 'right', sortable: true, format: (r) => t('ui.paxCount', { count: r.guests_count ?? 0 }) },
      // tables#101: a time from another day carries its date («27 sept, 20:05»), which the grid's
      // default 5.5rem floor cut at 768 px; TIME_WIDTH is the floor that fits it.
      { key: 'opened_at', header: t('ui.colOpenedAt'), sortable: true, width: TIME_WIDTH, format: (r) => clockTime(r.opened_at as string, this.now()) },
      {
        key: 'duration',
        header: t('ui.colDuration'),
        align: 'right',
        format: (r) => t('ui.durationMinutes', { minutes: durationMinutes(r as unknown as Session, this.now()) }),
        render: (r) => html`<span class=${`tone-${this.durationTone(r)}`}>${t('ui.durationMinutes', { minutes: durationMinutes(r as unknown as Session, this.now()) })}</span>`,
      },
      {
        key: 'status',
        header: t('ui.colStatus'),
        sortable: true,
        filterable: true,
        filterType: 'select',
        options: STATUSES.map((s) => ({ value: s, label: t(STATUS_KEY[s]) })),
        format: (r) => (STATUS_KEY[r.status as string] ? t(STATUS_KEY[r.status as string]) : (r.status as string)),
      },
    ];
  }

  get actions(): DataTableAction[] {
    const t = (k: string): string => erplora().t(CATALOG, k);
    return [
      { id: 'detail', label: t('ui.actionDetail'), icon: 'eye-outline' },
      ...(can('tables.change_tablesession')
        ? [{ id: 'close', label: t('ui.actionCloseSession'), icon: 'checkmark-done-outline', color: 'danger', disabled: (r: Record<string, unknown>) => r.status !== 'active' }]
        : []),
    ];
  }

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('erplora:locale-changed', this.onLocaleChange);
  }

  async firstUpdated(): Promise<void> {
    this.ctrl = createListController<Session>(erplora(), 'tables.sessions.list', () => this.requestUpdate(), {
      pageSize: 50,
      sort: 'opened_at',
      dir: 'desc',
      // Open checks first: that is what the room asks for.
      filters: { status: 'active' },
    });
    await Promise.all([this.ctrl.load(), this.loadZones(), this.loadSettings(), this.loadWaiters()]);
    try {
      const offs = [
        erplora().on('tables.session.opened', () => this.ctrl.load()),
        erplora().on('tables.session.closed', () => this.ctrl.load()),
        erplora().on('tables.session.transferred', () => this.ctrl.load()),
        erplora().on('tables.session.merged', () => this.ctrl.load()),
        erplora().on('tables.session.split', () => this.ctrl.load()),
        erplora().on('tables.session.parked', () => this.ctrl.load()),
        erplora().on('tables.session.restored', () => this.ctrl.load()),
        erplora().on('tables.session.updated', () => this.ctrl.load()),
        erplora().on('tables.session.deleted', () => this.ctrl.load()),
        erplora().on('tables.settings.updated', () => this.loadSettings()),
      ];
      this.unsub = () => offs.forEach((o) => o());
    } catch {
      /* preview without SDK */
    }
    this.timer = setInterval(() => this.requestUpdate(), REFRESH_MS);
  }

  disconnectedCallback(): void {
    window.removeEventListener('erplora:locale-changed', this.onLocaleChange);
    this.unsub?.();
    if (this.timer) clearInterval(this.timer);
    super.disconnectedCallback();
  }

  private async loadZones(): Promise<void> {
    try {
      // `queryAll`: the filter wants every zone, not the first page (ADR-0124).
      const rows = await erplora().queryAll<Zone>('tables.zones.list', { sort: 'sort_order', dir: 'asc' });
      this.zones = Array.isArray(rows) ? rows : [];
    } catch {
      this.zones = [];
    }
  }

  /** tables#74 — the people behind `waiter_id`, through the CORE namespace (ADR-0192): the module
   *  never joins `hub_user`. Best-effort, exactly like kitchen's KDS card and the printed chit: no
   *  permission, no SDK or a failing call leaves the column blank and the list working. */
  private async loadWaiters(): Promise<void> {
    try {
      const rows = await erplora().query<HubUser[]>('hub.users.list');
      this.waiters = (Array.isArray(rows) ? rows : []).filter((u) => u && u.id && String(u.name ?? '').trim());
    } catch {
      this.waiters = [];
    }
  }

  /**
   * The NAME of a `waiter_id`, or '' when there is none to show.
   *
   * '' covers three cases on purpose and all of them read the same «—»: the check carries no waiter
   * (opened before tables#70), the hub does not list that id any more (someone who left the shift),
   * or the list could not be loaded. A raw UUID in a list of checks is worse than an empty cell —
   * nobody can act on it, and it makes the column look broken.
   */
  waiterName(waiterId: unknown): string {
    const id = waiterId == null ? '' : String(waiterId);
    if (!id) return '';
    return this.waiters.find((u) => String(u.id) === id)?.name ?? '';
  }

  private async loadSettings(): Promise<void> {
    try {
      const r = await erplora().query<RoomSettings | RoomSettings[]>('tables.settings.get');
      const row = Array.isArray(r) ? r[0] : r;
      this.settings = {
        timer_warning_minutes: Number(row?.timer_warning_minutes) || DEFAULT_SETTINGS.timer_warning_minutes,
        timer_critical_minutes: Number(row?.timer_critical_minutes) || DEFAULT_SETTINGS.timer_critical_minutes,
      };
    } catch {
      this.settings = { ...DEFAULT_SETTINGS };
    }
  }

  /** Tone of the duration cell: only an OPEN check is an alarm; history is never coloured. */
  durationTone(r: Record<string, unknown>): 'ok' | 'warning' | 'critical' {
    if (r.status !== 'active') return 'ok';
    const m = durationMinutes(r as unknown as Session, this.now());
    if (m >= this.settings.timer_critical_minutes) return 'critical';
    if (m >= this.settings.timer_warning_minutes) return 'warning';
    return 'ok';
  }

  private onSegment(id: string): void {
    const seg = SEGMENTS.find((s) => s.id === id) ?? SEGMENTS[0];
    this.segment = seg.id;
    this.ctrl.setFilter('status', seg.status);
  }

  /** The `zone` column filters by `zone_id` on the server; the rest map 1:1. */
  private onFilterChange(detail: { col?: string; value?: unknown; filters?: Record<string, unknown> }): void {
    if (detail.filters) {
      for (const [col, value] of Object.entries(detail.filters)) this.ctrl.setFilter(col === 'zone' ? 'zone_id' : col, value);
      return;
    }
    if (!detail.col) return;
    this.ctrl.setFilter(detail.col === 'zone' ? 'zone_id' : detail.col, detail.value);
  }

  async onRowAction(ev: CustomEvent<{ actionId: string; row: Record<string, unknown> }>): Promise<void> {
    const { actionId, row } = ev.detail;
    const s = row as unknown as Session;
    if (actionId === 'detail') {
      this.detail = s;
    } else if (actionId === 'close' && s.status === 'active' && can('tables.change_tablesession')) {
      // Never close straight away: closing frees the table and ends the service segment.
      this.closeTarget = s;
    }
  }

  async confirmClose(): Promise<void> {
    if (!this.closeTarget) return;
    const target = this.closeTarget;
    this.saving = true;
    this.error = '';
    try {
      await erplora().command('tables.sessions.close', { session_id: target.id, notes: null });
      await this.ctrl.load();
    } catch (e) {
      this.error = domainMessage(e, erplora().locale, erplora().t(CATALOG, 'ui.errCloseSession'));
    } finally {
      this.closeTarget = null;
      this.saving = false;
    }
  }

  render() {
    const t = (k: string, p?: Record<string, unknown>): string => erplora().t(CATALOG, k, p);
    return html`<div class="page">
      ${this.error ? html`<ok-inline-feedback data-testid="tables-sessions-error" tone="danger" icon="alert-circle-outline">${this.error}</ok-inline-feedback>` : nothing}
      ${this.ctrl?.error ? html`<ok-inline-feedback data-testid="tables-sessions-load-error" tone="danger" icon="alert-circle-outline">${this.ctrl.error}</ok-inline-feedback>` : nothing}

      <ion-segment data-testid="tables-sessions-tabs" value=${this.segment} @ionChange=${(e: CustomEvent) => this.onSegment(String((e.detail as { value: string }).value))}>
        ${SEGMENTS.map((s) => html`<ion-segment-button data-testid=${`tables-sessions-tab-${s.id}`} value=${s.id}><ion-label>${t(s.key)}</ion-label></ion-segment-button>`)}
      </ion-segment>

      <ok-data-table
        testid="tables-sessions-table"
        .serverSide=${true}
        .fill=${true}
        .labels=${dataTableLabels(erplora().locale)}
        .columns=${this.columns}
        .actions=${this.actions} .rowClickable=${true}
        .views=${true}
        .columnPicker=${true}
        .cardTitle=${(r: Record<string, unknown>) => (r.table_number ? t('ui.tableLabel', { number: r.table_number }) : t('ui.noTable'))}
        .cardIcon=${() => 'time-outline'}
        .rows=${this.ctrl?.rows ?? []}
        .total=${this.ctrl?.total ?? 0}
        .page=${this.ctrl?.state.page ?? 0}
        .pageSize=${this.ctrl?.state.pageSize ?? 50}
        .sort=${this.ctrl?.state.sort}
        .sortDir=${this.ctrl?.state.dir ?? 'desc'}
        .searchable=${true}
        .searchPlaceholder=${t('ui.searchSession')}
        .emptyMessage=${this.ctrl?.loading ? t('ui.loading') : t('ui.emptySessions')}
        @rowAction=${(e: CustomEvent<{ actionId: string; row: Record<string, unknown> }>) => this.onRowAction(e)} @rowClick=${(e: CustomEvent<{ row: Record<string, unknown> }>) => this.onRowAction({ detail: { actionId: 'detail', row: e.detail.row } } as CustomEvent<{ actionId: string; row: Record<string, unknown> }>)}
        @pageChange=${(e: CustomEvent<number>) => this.ctrl.setPage(e.detail)}
        @pageSizeChange=${(e: CustomEvent<number>) => this.ctrl.setPageSize(e.detail)}
        @sortChange=${(e: CustomEvent<{ sort: string; dir: 'asc' | 'desc' }>) => this.ctrl.setSort(e.detail.sort, e.detail.dir)}
        @searchChange=${(e: CustomEvent<string>) => this.ctrl.setSearch(e.detail)}
        @filterChange=${(e: CustomEvent<{ col?: string; value?: unknown; filters?: Record<string, unknown> }>) => this.onFilterChange(e.detail)}
      ></ok-data-table>

      <!-- Detail. ion-modal reparents to <body>: Ionic classes only, no shadow CSS. -->
      <ion-modal data-testid="tables-sessions-detail" .isOpen=${!!this.detail} @ionModalDidDismiss=${() => (this.detail = null)}>
        ${this.detail ? this.renderDetail(this.detail, t) : nothing}
      </ion-modal>

      <!-- Close confirmation. -->
      <ion-modal data-testid="tables-sessions-close-modal" .isOpen=${!!this.closeTarget} @ionModalDidDismiss=${() => (this.closeTarget = null)}>
        <ion-header class="ion-no-border"><ion-toolbar><ion-title>${t('ui.closeSessionTitle')}</ion-title></ion-toolbar></ion-header>
        <ion-content class="ion-padding">
          <ion-list lines="none">
            <ion-item><ion-label class="ion-text-wrap">
              ${t('ui.closeSessionImpact', { number: this.closeTarget?.table_number ?? '—', count: this.closeTarget?.guests_count ?? 0 })}
            </ion-label></ion-item>
          </ion-list>
          <ion-button data-testid="tables-sessions-close-confirm" class="ion-margin-top" expand="block" style=${ionTone('solid', 'danger')} ?disabled=${this.saving} @click=${() => this.confirmClose()}>${t('ui.actionCloseSession')}</ion-button>
          <ion-button data-testid="tables-sessions-close-cancel" expand="block" fill="outline" @click=${() => (this.closeTarget = null)}>${t('ui.cancel')}</ion-button>
        </ion-content>
      </ion-modal>
    </div>`;
  }

  private renderDetail(s: Session, t: (k: string, p?: Record<string, unknown>) => string) {
    const row = (label: string, value: unknown) => html`<ion-item><ion-label class="ion-text-wrap"><p>${label}</p><h3>${value ?? '—'}</h3></ion-label></ion-item>`;
    return html`
      <ion-header class="ion-no-border"><ion-toolbar>
        <ion-title>${s.table_number ? t('ui.tableLabel', { number: s.table_number }) : t('ui.noTable')}</ion-title>
        <ion-buttons slot="end"><ion-button data-testid="tables-sessions-detail-close" @click=${() => (this.detail = null)}>${t('ui.close')}</ion-button></ion-buttons>
      </ion-toolbar></ion-header>
      <ion-content class="ion-padding">
        <ion-list lines="none">
          ${row(t('ui.colZone'), s.zone || '—')}
          ${row(t('ui.colWaiter'), this.waiterName(s.waiter_id) || '—')}
          ${row(t('ui.colStatus'), STATUS_KEY[s.status] ? t(STATUS_KEY[s.status]) : s.status)}
          ${row(t('ui.colGuests'), t('ui.paxCount', { count: s.guests_count ?? 0 }))}
          ${row(t('ui.colOpenedAt'), clockTime(s.opened_at, this.now()))}
          ${row(t('ui.colClosedAt'), clockTime(s.closed_at, this.now()))}
          ${row(t('ui.colDuration'), t('ui.durationMinutes', { minutes: durationMinutes(s, this.now()) }))}
          ${row(t('ui.colPaidTotal'), paidAmount(s.paid_total))}
          ${row(t('ui.colNotes'), s.notes || '—')}
        </ion-list>
        ${s.status === 'active' && can('tables.change_tablesession')
          ? html`<ion-button data-testid="tables-sessions-detail-close-session" class="ion-margin-top" expand="block" style=${ionTone('solid', 'danger')} @click=${() => { this.closeTarget = s; this.detail = null; }}>${t('ui.actionCloseSession')}</ion-button>`
          : nothing}
      </ion-content>`;
  }
}

define('erp-tables-sessions', ErpTablesSessions);

declare global {
  interface HTMLElementTagNameMap {
    'erp-tables-sessions': ErpTablesSessions;
  }
}
