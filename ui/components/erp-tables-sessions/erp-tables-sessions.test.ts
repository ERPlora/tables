// Contract of the SESSIONS view (tables#3 b).
//
// Until now `/m/tables/sessions` mounted the table list — a false door. The market shows the
// checks of the room as a list (Toast "All checks": open / paid / closed; Square "Orders" with
// reopen / close; Odoo "orders" per floor): table, zone, covers, time seated, status, linked
// check. Here: a data table over `tables.sessions.list`, ACTIVE by default with a status filter
// and a zone filter (the zones of the hub, a closed domain → select), duration computed in the UI
// from `opened_at`/`closed_at` (tables#4: `duration_minutes` is derived, not stored), a detail
// modal per row and «close» (→ `tables.sessions.close`) only on active sessions, after confirming.
import { beforeEach, describe, expect, it } from 'vitest';

const ZONES = [
  { id: 'z1', name: 'Terraza', color: 'success', sort_order: 1, is_active: 1 },
  { id: 'z2', name: 'Salón', color: 'primary', sort_order: 2, is_active: 1 },
];

const NOW = new Date('2026-08-18T21:00:00Z');

const SESSIONS = [
  { id: 's1', table_id: 't1', table_number: '12', guests_count: 4, status: 'active', waiter_id: null, opened_at: '2026-08-18T20:15:00Z', closed_at: null, notes: '', order_id: 'o-1', split_from_id: null, zone_id: 'z1', zone: 'Terraza' },
  { id: 's2', table_id: 't2', table_number: '3', guests_count: 2, status: 'closed', waiter_id: null, opened_at: '2026-08-18T18:00:00Z', closed_at: '2026-08-18T19:30:00Z', notes: 'birthday', order_id: null, split_from_id: null, zone_id: 'z2', zone: 'Salón' },
];

// Room settings (tables#3 c): amber after 30 min, red after 60. Square paints the same two
// thresholds on its floor plan; here the duration cell carries the tone.
let SETTINGS: Record<string, unknown>[] = [{ id: 's', prompt_guests_on_seat: 1, timer_warning_minutes: 30, timer_critical_minutes: 60 }];

const commands: { name: string; payload: Record<string, unknown> }[] = [];
const pages: Record<string, unknown>[] = [];

beforeEach(() => {
  commands.length = 0;
  pages.length = 0;
  SETTINGS = [{ id: 's', prompt_guests_on_seat: 1, timer_warning_minutes: 30, timer_critical_minutes: 60 }];
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string) => (name === 'tables.settings.get' ? SETTINGS : []),
    queryAll: async (name: string) => (name === 'tables.zones.list' ? ZONES : []),
    queryPage: async (_name: string, params: Record<string, unknown>) => {
      pages.push(params);
      return { rows: SESSIONS, total: SESSIONS.length };
    },
    command: async (name: string, payload: Record<string, unknown>) => {
      commands.push({ name, payload });
      return {};
    },
    on: () => () => {},
    hasPermission: () => true,
    locale: 'es',
    t: (_catalog: unknown, key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${Object.values(params).join(',')}` : key,
  };
});

type Wc = HTMLElement & {
  shadowRoot: ShadowRoot;
  updateComplete: Promise<unknown>;
  columns: { key: string; filterType?: string; options?: { value: string }[]; format?: (r: Record<string, unknown>) => string }[];
  actions: { id: string; disabled?: (r: Record<string, unknown>) => boolean }[];
  detail: Record<string, unknown> | null;
  closeTarget: Record<string, unknown> | null;
  now: () => Date;
  durationTone: (r: Record<string, unknown>) => 'ok' | 'warning' | 'critical';
  onRowAction: (ev: CustomEvent<{ actionId: string; row: Record<string, unknown> }>) => Promise<void>;
  confirmClose: () => Promise<void>;
};

async function mount(): Promise<Wc> {
  await import('./erp-tables-sessions');
  const el = document.createElement('erp-tables-sessions') as Wc;
  el.now = () => NOW;
  document.body.appendChild(el);
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
  return el;
}

const table = (el: Wc) =>
  el.shadowRoot.querySelector('ok-data-table') as (HTMLElement & { rows: unknown[]; addable: boolean; fill: boolean }) | null;

describe('the sessions view lists SESSIONS, not tables', () => {
  it('mounts a data table over tables.sessions.list, filling the height, without a «+» (sessions open from the POS)', async () => {
    const el = await mount();
    expect(table(el)).toBeTruthy();
    expect(table(el)!.rows.length).toBe(2);
    expect(table(el)!.fill).toBe(true);
    expect(table(el)!.addable).toBeFalsy();
  });

  it('shows table, zone, covers, opened at, duration and status', async () => {
    const el = await mount();
    const keys = el.columns.map((c) => c.key);
    for (const k of ['table_number', 'zone', 'guests_count', 'opened_at', 'duration', 'status']) expect(keys, k).toContain(k);
  });

  it('duration is derived: now − opened_at for an active session, closed_at − opened_at for a closed one (tables#4)', async () => {
    const el = await mount();
    const col = el.columns.find((c) => c.key === 'duration')!;
    expect(col.format!(SESSIONS[0])).toBe('ui.durationMinutes:45');
    expect(col.format!(SESSIONS[1])).toBe('ui.durationMinutes:90');
  });

  it('opens ACTIVE sessions by default (the room wants what is open now)', async () => {
    await mount();
    const first = pages[0] as { filters?: Record<string, unknown> } | undefined;
    expect(first?.filters?.status, 'the first page must be filtered to active').toBe('active');
  });

  it('status and zone are select filters: status over the session states, zone over the REAL zones', async () => {
    const el = await mount();
    const status = el.columns.find((c) => c.key === 'status');
    expect(status?.filterType).toBe('select');
    expect(status?.options?.map((o) => o.value)).toEqual(['active', 'closed', 'transferred', 'merged', 'parked']);
    const zone = el.columns.find((c) => c.key === 'zone');
    expect(zone?.filterType).toBe('select');
    expect(zone?.options?.map((o) => o.value)).toEqual(['z1', 'z2']);
  });
});

describe('detail and close', () => {
  it('offers detail and close as row actions; close is disabled on a non-active session', async () => {
    const el = await mount();
    expect(el.actions.map((a) => a.id)).toEqual(['detail', 'close']);
    const close = el.actions.find((a) => a.id === 'close')!;
    expect(close.disabled?.(SESSIONS[0])).toBe(false);
    expect(close.disabled?.(SESSIONS[1])).toBe(true);
  });

  it('detail opens the row without sending anything', async () => {
    const el = await mount();
    await el.onRowAction(new CustomEvent('rowAction', { detail: { actionId: 'detail', row: SESSIONS[1] } }));
    expect(el.detail?.id).toBe('s2');
    expect(commands.length).toBe(0);
  });

  it('close asks first, then sends tables.sessions.close with the session_id', async () => {
    const el = await mount();
    await el.onRowAction(new CustomEvent('rowAction', { detail: { actionId: 'close', row: SESSIONS[0] } }));
    expect(commands.length, 'close must confirm before sending').toBe(0);
    expect(el.closeTarget?.id).toBe('s1');
    await el.confirmClose();
    expect(commands.map((c) => c.name)).toEqual(['tables.sessions.close']);
    expect(commands[0].payload).toEqual({ session_id: 's1', notes: null });
    expect(el.closeTarget).toBeNull();
  });

  it('close on a closed session is ignored', async () => {
    const el = await mount();
    await el.onRowAction(new CustomEvent('rowAction', { detail: { actionId: 'close', row: SESSIONS[1] } }));
    expect(el.closeTarget).toBeNull();
  });
});

describe('room settings colour the open checks (tables#3 c)', () => {
  it('an open check past the amber threshold is `warning`, past the red one `critical`, a closed check is never coloured', async () => {
    const el = await mount();
    // s1 opened at 20:15, now 21:00 → 45 min: past amber (30), before red (60).
    expect(el.durationTone(SESSIONS[0])).toBe('warning');
    expect(el.durationTone({ ...SESSIONS[0], opened_at: '2026-08-18T19:50:00Z' })).toBe('critical'); // 70 min
    expect(el.durationTone({ ...SESSIONS[0], opened_at: '2026-08-18T20:50:00Z' })).toBe('ok'); // 10 min
    expect(el.durationTone(SESSIONS[1]), 'closed: history is not an alarm').toBe('ok');
  });

  it('with no settings row the schema defaults apply (60 / 90)', async () => {
    SETTINGS = [];
    const el = await mount();
    expect(el.durationTone(SESSIONS[0]), '45 min < 60 → ok').toBe('ok');
    expect(el.durationTone({ ...SESSIONS[0], opened_at: '2026-08-18T19:50:00Z' }), '70 min → warning').toBe('warning');
    expect(el.durationTone({ ...SESSIONS[0], opened_at: '2026-08-18T19:20:00Z' }), '100 min → critical').toBe('critical');
  });
});
