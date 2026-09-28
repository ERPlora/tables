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
  el.shadowRoot.querySelector('ok-data-table') as (HTMLElement & { rows: unknown[]; addable: boolean; fill: boolean; rowClickable: boolean }) | null;

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

// ── pm#155 (outfitkit#67, second half) ────────────────────────────────────────────────────────
//
// At 1440 px the «Actions» column fell off the screen with nothing hinting the table went on to
// the right, so the only door into a session was a button nobody could see. OutfitKit 0.1.44
// pins that column, but the other half of the fix is opt-in: `rowClickable` turns the whole row
// into a door — the first thing a user tries. The list has to ask for it, and wire `rowClick`
// to the same detail the «detail» action opens.
describe('clicking the row opens the session (pm#155)', () => {
  it('the table declares `rowClickable` → the whole row is a door, not just the action button', async () => {
    const el = await mount();
    expect(
      table(el)?.rowClickable,
      'without `rowClickable` the row is dead: if the actions column is off-screen there is no way in',
    ).toBe(true);
  });

  it('`rowClick` opens the detail of the clicked session, same as the «detail» action', async () => {
    const el = await mount();
    table(el)!.dispatchEvent(new CustomEvent('rowClick', { detail: { row: SESSIONS[0] } }));
    await new Promise((r) => setTimeout(r, 0));
    await el.updateComplete;
    expect(el.detail, 'the row was clicked and the detail did not open').toEqual(SESSIONS[0]);
  });
});

// ── tables#74 ─────────────────────────────────────────────────────────────────────────────────
//
// `waiter_id` has travelled on the session since tables#70 — the open command stamps it, transfer
// and split copy it, `queries/sessions_list.sql` projects it and the type declares it — and the
// screen threw it away. With several checks open there was no way to tell whose is whose, which is
// exactly what tables#70 was for (sales#179: the server is stuck to the check and is transferable).
//
// The id is resolved to a person the way the KDS card and the printed chit already do it
// (ADR-0192, kitchen#63): `hub.users.list`, the CORE namespace — never a JOIN against the core's
// tables. Without a resolvable name the cell is blank: a UUID in a list of checks is worse than an
// empty cell, because nobody can act on it.
const WAITERS = [
  { id: 'u-7', name: 'Marta' },
  { id: 'u-9', name: 'Luis' },
];

/** Re-stubs `query` so `hub.users.list` answers `users`, keeping the settings answer intact. */
function withWaiters(users: unknown) {
  const sdk = (globalThis as Record<string, unknown>).erplora as Record<string, unknown>;
  sdk.query = async (name: string) => {
    if (name === 'hub.users.list') {
      if (users instanceof Error) throw users;
      return users;
    }
    return name === 'tables.settings.get' ? SETTINGS : [];
  };
}

const SERVED = [
  { ...SESSIONS[0], waiter_id: 'u-7' },
  { ...SESSIONS[1], waiter_id: 'u-nobody' },
];

describe('the sessions list says WHO owns each check (tables#74)', () => {
  it('has a waiter column', async () => {
    withWaiters(WAITERS);
    const el = await mount();
    expect(el.columns.map((c) => c.key), 'the check does not say whose it is').toContain('waiter_id');
  });

  it('renders the NAME, never the id', async () => {
    withWaiters(WAITERS);
    const el = await mount();
    const col = el.columns.find((c) => c.key === 'waiter_id')!;
    expect(col.format!(SERVED[0])).toBe('Marta');
  });

  it('an id the hub does not list, or a check with no waiter, reads «—»', async () => {
    withWaiters(WAITERS);
    const el = await mount();
    const col = el.columns.find((c) => c.key === 'waiter_id')!;
    expect(col.format!(SERVED[1]), 'a uuid in a list of checks helps nobody').toBe('—');
    expect(col.format!(SESSIONS[0]), 'a check opened before tables#70 has no waiter').toBe('—');
  });

  it('can be narrowed to one waiter: a select over the hub people, filtering by `waiter_id`', async () => {
    withWaiters(WAITERS);
    const el = await mount();
    const col = el.columns.find((c) => c.key === 'waiter_id')!;
    expect(col.filterType).toBe('select');
    expect(col.options?.map((o) => o.value)).toEqual(['u-7', 'u-9']);

    pages.length = 0;
    table(el)!.dispatchEvent(new CustomEvent('filterChange', { detail: { col: 'waiter_id', value: 'u-7' } }));
    await new Promise((r) => setTimeout(r, 0));
    const asked = pages.at(-1) as { filters?: Record<string, unknown> } | undefined;
    expect(asked?.filters?.waiter_id, 'the manifest already declares waiter_id(eq)').toBe('u-7');
  });

  it('the detail of a session names the waiter', async () => {
    withWaiters(WAITERS);
    const el = await mount();
    await el.onRowAction(new CustomEvent('rowAction', { detail: { actionId: 'detail', row: SERVED[0] } }));
    await el.updateComplete;
    const modal = el.shadowRoot.querySelector('ion-modal');
    expect((modal?.textContent ?? ''), 'the detail does not say who is serving').toContain('Marta');
  });

  it('if hub.users.list fails the list still works — degraded, never broken', async () => {
    withWaiters(new Error('no permission'));
    const el = await mount();
    expect(table(el)!.rows.length, 'the list died because the people could not be listed').toBe(2);
    const col = el.columns.find((c) => c.key === 'waiter_id')!;
    expect(col.format!(SERVED[0])).toBe('—');
  });
});


// hub#1182 — the «Zone» box paints the zone NAME, but the server filters `zone_id` (declared `eq`
// in `tables.sessions.list`; `zone` is not declared at all). The remap is one line per path in
// `onFilterChange`; without it the box sends `f_zone`, the runtime drops it, and the box does
// nothing — no error, the same rows as before. Both paths the table can take are pinned here.
describe('the zone box reaches the server as zone_id (hub#1182)', () => {
  const lastAsked = () => pages.at(-1) as { filters?: Record<string, unknown> } | undefined;

  it('one box at a time: choosing a zone asks the server for zone_id, never zone', async () => {
    const el = await mount();
    pages.length = 0;
    table(el)!.dispatchEvent(new CustomEvent('filterChange', { detail: { col: 'zone', value: 'z1' } }));
    await new Promise((r) => setTimeout(r, 0));
    expect(lastAsked()?.filters?.zone_id).toBe('z1');
    expect(lastAsked()?.filters, '`f_zone` is not declared: the runtime would drop it').not.toHaveProperty('zone');
  });

  it('the whole drawer at once: the zone entry is rerouted too, the rest stays as painted', async () => {
    const el = await mount();
    pages.length = 0;
    table(el)!.dispatchEvent(new CustomEvent('filterChange', { detail: { filters: { zone: 'z2', waiter_id: 'u-7' } } }));
    await new Promise((r) => setTimeout(r, 0));
    expect(lastAsked()?.filters?.zone_id).toBe('z2');
    expect(lastAsked()?.filters?.waiter_id).toBe('u-7');
    expect(lastAsked()?.filters).not.toHaveProperty('zone');
  });
});

// ── tables#96 ─────────────────────────────────────────────────────────────────────────────────
//
// Sessions › Closed printed the first 8 characters of the order's INTERNAL id under «Check» (and
// the detail the whole id), and the amount charged appeared nowhere — not in the desktop table, not
// in the phone cards. The market lists closed checks WITH their total (Toast «Closed checks»,
// Square «Orders», Lightspeed «Closed receipts»). `tables.sessions.list` now projects `paid_total`
// (cents, what the check's order charged and was not voided); the screen formats it with the hub's
// currency and never shows the order id.
const PAID = [
  { ...SESSIONS[0], paid_total: null },
  { ...SESSIONS[1], order_id: '6ab5397f-1c2d-4e5f-8a9b-0c1d2e3f4a5b', paid_total: 3850 },
];

/** The SDK money formatter, stubbed so the test sees WHICH number reached it. */
function withMoney() {
  const sdk = (globalThis as Record<string, unknown>).erplora as Record<string, unknown>;
  sdk.formatMoney = (minor: number) => `€${(minor / 100).toFixed(2)}`;
  sdk.queryPage = async (_name: string, params: Record<string, unknown>) => {
    pages.push(params);
    return { rows: PAID, total: PAID.length };
  };
}

async function showSegment(el: Wc, id: string) {
  const seg = el.shadowRoot.querySelector('[data-testid="tables-sessions-tabs"]')!;
  seg.dispatchEvent(new CustomEvent('ionChange', { detail: { value: id } }));
  await el.updateComplete;
}

type Col = Wc['columns'][number] & { hidden?: boolean };

describe('a closed check says what it charged, never the internal order id (tables#96)', () => {
  it('no column shows the order id', async () => {
    withMoney();
    const el = await mount();
    expect(el.columns.map((c) => c.key), 'the internal order id is still a column').not.toContain('order_id');
    for (const c of el.columns) {
      expect(c.format?.(PAID[1]) ?? '', `column ${c.key} leaks the order id`).not.toContain('6ab5397f');
    }
  });

  it('the amount column formats the cents with the hub currency', async () => {
    withMoney();
    const el = await mount();
    const col = el.columns.find((c) => c.key === 'paid_total');
    expect(col, 'there is no amount column').toBeTruthy();
    expect(col!.format!(PAID[1])).toBe('€38.50');
  });

  it('a check with nothing charged reads «—», never «€0.00»', async () => {
    withMoney();
    const el = await mount();
    const col = el.columns.find((c) => c.key === 'paid_total')!;
    expect(col.format!(PAID[0])).toBe('—');
  });

  it('the amount is VISIBLE on Closed and All — desktop columns and phone cards alike — and sortable', async () => {
    withMoney();
    const el = await mount();
    for (const seg of ['closed', 'all']) {
      await showSegment(el, seg);
      const col = el.columns.find((c) => c.key === 'paid_total') as Col;
      expect(col.hidden, `the amount is hidden on «${seg}»`).toBeFalsy();
      expect((col as Col & { sortable?: boolean }).sortable, 'the owner cannot sort by amount').toBe(true);
    }
  });

  it('the amount comes right after the table, so a tablet sees it without scrolling sideways', async () => {
    // Seen on the bench at 768 px: as the LAST column, «Charged» fell past the right edge of the
    // grid — the one figure the screen exists for needed a sideways scroll. Toast and Square lead a
    // closed check with its table and its total.
    withMoney();
    const el = await mount();
    await showSegment(el, 'closed');
    expect(el.columns.map((c) => c.key).slice(0, 2)).toEqual(['table_number', 'paid_total']);
  });

  it('on Open the amount column is hidden: nothing is charged while the party sits', async () => {
    withMoney();
    const el = await mount();
    const col = el.columns.find((c) => c.key === 'paid_total') as Col;
    expect(col.hidden).toBe(true);
  });

  it('the detail shows the amount charged and not the order id', async () => {
    withMoney();
    const el = await mount();
    await el.onRowAction(new CustomEvent('rowAction', { detail: { actionId: 'detail', row: PAID[1] } }));
    await el.updateComplete;
    const text = el.shadowRoot.querySelector('[data-testid="tables-sessions-detail"]')?.textContent ?? '';
    expect(text, 'the detail does not say what was charged').toContain('€38.50');
    expect(text, 'the detail still prints the internal order id').not.toContain('6ab5397f');
  });
});

// ── tables#101 ────────────────────────────────────────────────────────────────────────────────
//
// Sessions › Closed listed table, zone, waiter, covers, opening time and duration, but not WHEN
// each check was closed: the «Closed» column was hidden on every tab and had to be switched on by
// hand each time. Toast «Closed checks» and Square «Orders» show the closing time. Same rule as the
// amount (tables#96): visible on Closed and All, hidden on Open (it always reads «—» there).
//
// The time reads the business wall clock (`erplora.timezone`) in the hub's language (never the ISO
// string), and the Closed tab is not limited to today, so a check closed on another day also
// carries its date — «19:30» alone would pass last week's check off as tonight's.
const BUSINESS_ZONE = 'Europe/Madrid';
/** A Madrid wall time as an instant: UTC+2 from April to October, UTC+1 otherwise (enough for these fixtures). */
const at = (y: number, mo: number, d: number, h: number, mi: number) =>
  new Date(Date.UTC(y, mo - 1, d, h - (mo >= 4 && mo <= 10 ? 2 : 1), mi)).toISOString();
const TONIGHT = new Date(at(2026, 8, 18, 23, 0));
const CLOSED = [
  { ...SESSIONS[1], id: 'c1', opened_at: at(2026, 8, 18, 18, 0), closed_at: at(2026, 8, 18, 19, 30) },
  { ...SESSIONS[1], id: 'c2', opened_at: at(2026, 8, 17, 18, 0), closed_at: at(2026, 8, 17, 19, 30) },
  { ...SESSIONS[1], id: 'c3', opened_at: at(2025, 12, 31, 22, 0), closed_at: at(2025, 12, 31, 23, 45) },
];
const ISO = /\d{4}-\d{2}-\d{2}|T\d{2}:\d{2}|Z$/;
/** Intl separates «7:30» from «PM» with a narrow no-break space; compare on plain spaces. */
const plain = (s: string) => s.replace(/\s/g, ' ');

async function mountClosed(locale = 'es'): Promise<Wc> {
  const sdk = (globalThis as Record<string, unknown> & { erplora: Record<string, unknown> }).erplora;
  sdk.locale = locale;
  sdk.timezone ??= BUSINESS_ZONE;
  const el = await mount();
  el.now = () => TONIGHT;
  return el;
}

const closedCol = (el: Wc) => el.columns.find((c) => c.key === 'closed_at') as Col & { sortable?: boolean };
const openedCol = (el: Wc) => el.columns.find((c) => c.key === 'opened_at') as Col;

describe('a closed check says when it was closed (tables#101)', () => {
  it('the closing time is VISIBLE on Closed and All, and sortable', async () => {
    const el = await mountClosed();
    for (const seg of ['closed', 'all']) {
      await showSegment(el, seg);
      expect(closedCol(el).hidden, `the closing time is hidden on «${seg}»`).toBeFalsy();
      expect(closedCol(el).sortable, 'the manager cannot sort by closing time').toBe(true);
    }
  });

  it('the closing time comes right after the amount, so a 768 px tablet sees it without scrolling sideways', async () => {
    // Seen on the bench (hub:dev, 768 px): next to «Opened», «Closed» fell under the pinned actions
    // column and needed a sideways scroll. Toast «Closed checks» reads table, total, closed time.
    const el = await mountClosed();
    await showSegment(el, 'closed');
    expect(el.columns.map((c) => c.key).slice(0, 3)).toEqual(['table_number', 'paid_total', 'closed_at']);
  });

  it('on Open the closing time is hidden: an open check has not closed', async () => {
    const el = await mountClosed();
    expect(el.segment).toBe('open');
    expect(closedCol(el).hidden).toBe(true);
    await showSegment(el, 'closed');
    await showSegment(el, 'open');
    expect(closedCol(el).hidden, 'back on Open the column shows again').toBe(true);
  });

  it('a check closed today reads the business clock in Spanish: «19:30», no date, no ISO', async () => {
    const el = await mountClosed('es');
    expect(closedCol(el).format!(CLOSED[0])).toBe('19:30');
  });

  it('a check closed today reads the business clock in English: «7:30 PM»', async () => {
    const el = await mountClosed('en');
    expect(plain(closedCol(el).format!(CLOSED[0]))).toBe('7:30 PM');
  });

  it('a check closed on an earlier day carries its date, in the hub language', async () => {
    const es = await mountClosed('es');
    const txt = plain(closedCol(es).format!(CLOSED[1]));
    expect(txt).not.toMatch(ISO);
    expect(txt).toContain('17');
    expect(txt).toContain('ago');
    expect(txt).toContain('19:30');
    expect(txt).not.toContain('2026');
    es.remove();
    const en = await mountClosed('en');
    const t2 = plain(closedCol(en).format!(CLOSED[1]));
    expect(t2).toContain('Aug 17');
    expect(t2).toContain('7:30 PM');
  });

  it('a check closed in another year carries the year too', async () => {
    const el = await mountClosed('es');
    const txt = plain(closedCol(el).format!(CLOSED[2]));
    expect(txt).toContain('2025');
    expect(txt).toContain('31');
    expect(txt).toContain('23:45');
  });

  it('the time columns are wide enough for a date and a time: «27 sept, 21:40» is not cut at 768 px', async () => {
    // Seen on the bench (hub:dev, 768 px): with the grid's default 5.5rem floor the closing time of
    // yesterday's check read «27 sept, 21:…» — the one figure the column exists for, cut off.
    const el = await mountClosed('es');
    await showSegment(el, 'closed');
    for (const col of [closedCol(el), openedCol(el)]) {
      const floor = /^minmax\((\d+(?:\.\d+)?)rem,\s*1fr\)$/.exec((col as Col & { width?: string }).width ?? '');
      expect(floor, `«${col.key}» keeps the default floor`).toBeTruthy();
      expect(Number(floor![1]), `«${col.key}» floor too narrow for a date and a time`).toBeGreaterThanOrEqual(8.5);
    }
  });

  it('an open check (no closing time) still reads «—»', async () => {
    const el = await mountClosed('es');
    expect(closedCol(el).format!({ ...CLOSED[0], closed_at: null })).toBe('—');
    expect(closedCol(el).format!({ ...CLOSED[0], closed_at: 'not-a-date' })).toBe('—');
  });

  it('the opening time follows the same rule, so a check open since yesterday says so', async () => {
    const el = await mountClosed('es');
    expect(openedCol(el).format!(CLOSED[0])).toBe('18:00');
    const txt = plain(openedCol(el).format!(CLOSED[1]));
    expect(txt).toContain('17');
    expect(txt).toContain('18:00');
  });

  it('«today» is the business day, not the UTC one: a check closed just before midnight, read just after, says yesterday', async () => {
    // Business in Madrid (UTC+2 in August) on a device pinned to UTC, so the two days really differ.
    const tz = process.env.TZ;
    process.env.TZ = 'UTC';
    try {
      const el = await mountClosed('es');
      // 23:50 on the 17th and 00:30 on the 18th, Madrid time: the same UTC day (the 17th).
      el.now = () => new Date('2026-08-17T22:30:00Z');
      const lateCheck = { ...CLOSED[0], closed_at: '2026-08-17T21:50:00Z' };
      expect(plain(closedCol(el).format!(lateCheck))).toContain('17');
      // 00:10 and 23:00 on the 18th, Madrid time: different UTC days, the same local one.
      el.now = () => new Date('2026-08-18T21:00:00Z');
      expect(closedCol(el).format!({ ...CLOSED[0], closed_at: '2026-08-17T22:10:00Z' })).toBe('0:10');
    } finally {
      if (tz === undefined) delete process.env.TZ;
      else process.env.TZ = tz;
    }
  });

  it('the detail shows the same closing time as the list, read on the same clock', async () => {
    const el = await mountClosed('en');
    await el.onRowAction(new CustomEvent('rowAction', { detail: { actionId: 'detail', row: CLOSED[0] } }));
    await el.updateComplete;
    const text = plain(el.shadowRoot.querySelector('[data-testid="tables-sessions-detail"]')?.textContent ?? '');
    expect(text, 'the detail has no closing time').toContain('7:30 PM');
    expect(text, 'the detail has no opening time').toContain('6:00 PM');
    expect(text, 'a check closed tonight carries a date in the detail').not.toContain('Aug');
    expect(text).not.toMatch(/T\d{2}:\d{2}/);
  });
});

// Review of tables#104: the times are read on the BUSINESS clock — the hub's IANA zone the shell
// publishes as `erplora.timezone` (hub#1212; appointments#12, reservations, whatsapp_inbox#183) —
// never on the device's. A tablet left on another zone must not move tonight's checks by hours,
// nor decide on its own which checks were closed «today».
describe('a closed check reads the BUSINESS clock, not the device one (tables#101 review)', () => {
  async function withZones(device: string, business: unknown, run: () => Promise<void>) {
    const tz = process.env.TZ;
    process.env.TZ = device;
    (globalThis as Record<string, unknown> & { erplora: Record<string, unknown> }).erplora.timezone = business;
    try {
      await run();
    } finally {
      if (tz === undefined) delete process.env.TZ;
      else process.env.TZ = tz;
    }
  }

  it('the hour is the business hour, whatever zone the tablet sits in', async () => {
    // 17:30 UTC = 19:30 in Madrid (the business) = 07:30 next day in Kiritimati (the tablet).
    await withZones('Pacific/Kiritimati', 'Europe/Madrid', async () => {
      const el = await mountClosed('es');
      el.now = () => new Date('2026-08-18T21:00:00Z'); // 23:00 in Madrid, same day
      expect(closedCol(el).format!({ ...CLOSED[0], closed_at: '2026-08-18T17:30:00Z' })).toBe('19:30');
      expect(openedCol(el).format!({ ...CLOSED[0], opened_at: '2026-08-18T16:00:00Z' })).toBe('18:00');
    });
  });

  it('«today» is the business day: a check closed before midnight in the shop, read after it, says yesterday', async () => {
    // Closed 23:50 on the 17th in Madrid, read at 00:30 on the 18th in Madrid. The tablet
    // (Kiritimati, UTC+14) sees both on the 18th and would drop the date.
    await withZones('Pacific/Kiritimati', 'Europe/Madrid', async () => {
      const el = await mountClosed('es');
      el.now = () => new Date('2026-08-17T22:30:00Z');
      const txt = plain(closedCol(el).format!({ ...CLOSED[0], closed_at: '2026-08-17T21:50:00Z' }));
      expect(txt).toContain('17');
      expect(txt).toContain('23:50');
    });
  });

  it('the detail reads the same business clock as the list', async () => {
    await withZones('Pacific/Kiritimati', 'Europe/Madrid', async () => {
      const el = await mountClosed('es');
      el.now = () => new Date('2026-08-18T21:00:00Z');
      await el.onRowAction(new CustomEvent('rowAction', { detail: { actionId: 'detail', row: { ...CLOSED[0], opened_at: '2026-08-18T16:00:00Z', closed_at: '2026-08-18T17:30:00Z' } } }));
      await el.updateComplete;
      const text = plain(el.shadowRoot.querySelector('[data-testid="tables-sessions-detail"]')?.textContent ?? '');
      expect(text).toContain('19:30');
      expect(text).toContain('18:00');
    });
  });

  it('no zone published degrades to UTC, like the runtime — never to the tablet zone', async () => {
    await withZones('Pacific/Kiritimati', '', async () => {
      const el = await mountClosed('es');
      el.now = () => new Date('2026-08-18T21:00:00Z');
      expect(closedCol(el).format!({ ...CLOSED[0], closed_at: '2026-08-18T17:30:00Z' })).toBe('17:30');
    });
  });

  it('a zone this browser cannot read degrades to UTC instead of blanking the list', async () => {
    await withZones('Pacific/Kiritimati', 'Mars/Olympus_Mons', async () => {
      const el = await mountClosed('es');
      el.now = () => new Date('2026-08-18T21:00:00Z');
      expect(closedCol(el).format!({ ...CLOSED[0], closed_at: '2026-08-18T17:30:00Z' })).toBe('17:30');
    });
  });
});
