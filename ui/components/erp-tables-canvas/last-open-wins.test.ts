// pm#459 — «edit zone» on the floor plan reads the full zone (`tables.zones.get`, the list has no
// description) and only THEN fills the sheet. Two openings in a row (edit «Salón», switch to
// «Terraza», edit it) can settle in reverse order: the late reply of the first one used to take
// over the sheet, so the sheet showed «Salón» while the plan was on «Terraza», and «Save» wrote
// on the zone the person had already left. The last opening wins.
import { beforeEach, describe, expect, it } from 'vitest';

const ZONES = [
  { id: 'z1', name: 'Salón', color: '#00f', sort_order: 1, is_active: 1 },
  { id: 'z2', name: 'Terraza', color: '#0f0', sort_order: 2, is_active: 1 },
];
const TABLES = [
  { id: 't1', number: '1', name: '', capacity: 4, shape: 'square', status: 'available', is_active: 1, zone_id: 'z1', position_x: 10, position_y: 10, width: 0, height: 0 },
];
const FULL: Record<string, Record<string, unknown>> = {
  z1: { ...ZONES[0], description: 'Inside' },
  z2: { ...ZONES[1], description: 'Outside' },
};

type Canvas = HTMLElement & {
  shadowRoot: ShadowRoot;
  updateComplete: Promise<unknown>;
  activeZone: string;
  zoneEdit?: { id: string; name: string; description?: string };
};

/** Replies of `tables.zones.get` held back per zone id; the rest answer at once. */
let held: Record<string, { resolve: () => void; reject: (e: unknown) => void }> = {};
let holdIds: string[] = [];
let zoneReads = 0;

beforeEach(() => {
  held = {};
  holdIds = [];
  zoneReads = 0;
  (globalThis as Record<string, unknown>).erplora = {
    query: (name: string, params: { zone_id?: string }) => {
      if (name !== 'tables.zones.get') return Promise.resolve([]);
      zoneReads++;
      const id = params.zone_id ?? '';
      if (!holdIds.includes(id)) return Promise.resolve(FULL[id]);
      return new Promise((resolve, reject) => {
        held[id] = { resolve: () => resolve(FULL[id]), reject };
      });
    },
    queryAll: async (name: string) => (name === 'tables.zones.list' ? ZONES : name === 'tables.tables.list' ? TABLES : []),
    queryPage: async () => ({ rows: [], total: 0 }),
    command: async () => ({}),
    on: () => () => {},
    locale: 'es',
    t: (_catalog: unknown, key: string) => key,
  };
});

const flush = async (el: Canvas) => {
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
};

async function mount(): Promise<Canvas> {
  await import('./erp-tables-canvas');
  const el = document.createElement('erp-tables-canvas') as unknown as Canvas;
  document.body.appendChild(el);
  await el.updateComplete;
  await flush(el);
  return el;
}

async function switchTo(el: Canvas, zoneId: string) {
  el.activeZone = zoneId;
  await el.updateComplete;
}

function clickEdit(el: Canvas) {
  (el.shadowRoot.querySelector('[data-testid="tables-floor-zone-edit"]') as HTMLElement).click();
}

const sheetName = (el: Canvas) =>
  (el.shadowRoot.querySelector('[data-testid="tables-floor-zone-name"]') as unknown as { value?: string } | null)?.value;

describe('two «edit zone» in a row on the floor plan: the last opening wins (pm#459)', () => {
  it('a single slow opening still fills the sheet with the full zone', async () => {
    holdIds = ['z1'];
    const el = await mount();
    clickEdit(el);
    await flush(el);
    expect(el.zoneEdit, 'nothing opens before the reply').toBeUndefined();
    held.z1.resolve();
    await flush(el);
    expect(el.zoneEdit?.id).toBe('z1');
    expect(el.zoneEdit?.description, 'the description comes from zones.get').toBe('Inside');
    expect(sheetName(el)).toBe('Salón');
  });

  it('when the FIRST reply settles last, the sheet keeps the SECOND zone', async () => {
    holdIds = ['z1'];
    const el = await mount();
    clickEdit(el);
    await flush(el);
    expect(zoneReads, 'the first opening is waiting for its zone').toBe(1);
    await switchTo(el, 'z2');
    clickEdit(el);
    await flush(el);
    expect(el.zoneEdit?.id).toBe('z2');
    held.z1.resolve();
    await flush(el);
    expect(el.zoneEdit?.id, 'the late reply of «Salón» took over the sheet of «Terraza»').toBe('z2');
    expect(sheetName(el)).toBe('Terraza');
    expect(el.zoneEdit?.description).toBe('Outside');
  });

  it('when the FIRST reply FAILS last, the sheet keeps the SECOND zone', async () => {
    holdIds = ['z1'];
    const el = await mount();
    clickEdit(el);
    await flush(el);
    expect(zoneReads).toBe(1);
    await switchTo(el, 'z2');
    clickEdit(el);
    await flush(el);
    held.z1.reject(new Error('network'));
    await flush(el);
    expect(el.zoneEdit?.id, 'the late failure of «Salón» took over the sheet of «Terraza»').toBe('z2');
    expect(sheetName(el)).toBe('Terraza');
  });

  // Review of tables#92: the person does not have to tap «edit» again to leave the zone behind —
  // while the zone is still loading nothing covers the bar, so they can switch zone, tap «+» or
  // tap a table. The late reply must not open «Edit Salón» over what they moved on to (services#106).
  it('switching zone while the edit is still loading drops the late reply', async () => {
    holdIds = ['z1'];
    const el = await mount();
    clickEdit(el);
    await flush(el);
    expect(zoneReads).toBe(1);
    await switchTo(el, 'z2');
    held.z1.resolve();
    await flush(el);
    expect(el.zoneEdit, 'the sheet of «Salón» opened over the plan of «Terraza»').toBeUndefined();
  });

  it('the «+» tapped while the edit is still loading keeps the add sheet alone', async () => {
    holdIds = ['z1'];
    const el = await mount();
    clickEdit(el);
    await flush(el);
    expect(zoneReads).toBe(1);
    (el.shadowRoot.querySelector('[data-testid="tables-floor-add"]') as HTMLElement).click();
    await flush(el);
    expect(el.shadowRoot.querySelector('[data-testid="tables-floor-add-sheet"]')).not.toBeNull();
    held.z1.resolve();
    await flush(el);
    expect(el.zoneEdit, 'the zone sheet stacked over the add sheet').toBeUndefined();
  });

  it('a table opened while the edit is still loading keeps its sheet alone', async () => {
    holdIds = ['z1'];
    const el = await mount();
    clickEdit(el);
    await flush(el);
    expect(zoneReads).toBe(1);
    el.shadowRoot.querySelector('[data-testid="tables-floor-tile-t1"]')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await flush(el);
    expect(el.shadowRoot.querySelector('[data-testid="tables-floor-table-sheet"]')).not.toBeNull();
    held.z1.reject(new Error('network'));
    await flush(el);
    expect(el.zoneEdit, 'the zone sheet stacked over the table sheet').toBeUndefined();
  });

  it('a double tap on «edit» of the SAME zone: the late first reply does not wipe what is typed', async () => {
    const el = await mount();
    const replies: Array<() => void> = [];
    const api = (globalThis as unknown as { erplora: { query: (name: string, p: { zone_id?: string }) => Promise<unknown> } }).erplora;
    api.query = (name, params) => (name !== 'tables.zones.get'
      ? Promise.resolve([])
      : new Promise((resolve) => { replies.push(() => resolve(FULL[params.zone_id ?? ''])); }));
    clickEdit(el);
    clickEdit(el);
    await flush(el);
    expect(replies.length, 'both openings are waiting').toBe(2);
    replies[1]();
    await flush(el);
    el.zoneEdit = { ...el.zoneEdit!, name: 'Salón grande' };
    await flush(el);
    replies[0]();
    await flush(el);
    expect(el.zoneEdit?.name, 'the late first reply overwrote the name being typed').toBe('Salón grande');
  });
});

