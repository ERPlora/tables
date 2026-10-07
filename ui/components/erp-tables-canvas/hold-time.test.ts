// tables#129 (TABLES-F25) — the floor plan: the reservation time is never clipped.
//
// The reserved tile painted «Name · 21:00» as ONE ellipsised line, so a very long name
// («Maximiliana Fernández de la Vega») pushed the time past the edge («Maximiliana Fernánde…») on
// desktop, tablet and phone: the manager saw the table was booked but not for when. Same recipe as
// «Choose table» (tables#126): the name and the time are two pieces of one row — the kit's
// truncated-title + fixed-tail row, as `ok-data-table`'s card head —, the name shrinks with an
// ellipsis and the time keeps its width. happy-dom does no layout, so the rules are anchored as
// declared; the real fit is measured on the bench (hub:stable, ios+md, 1440x900 / 820x1180 /
// 375x667, `logs/tables-129/floor-probe.cjs`).
import { beforeEach, describe, expect, it } from 'vitest';

const ZONAS = [{ id: 'z1', name: 'Salón', color: '#00f', sort_order: 1, is_active: 1 }];
const LONG = 'Maximiliana Fernández de la Vega';
const TILE = {
  name: '', capacity: 4, shape: 'square', status: 'reserved', is_active: 1, zone_id: 'z1',
  width: 80, height: 80, reserved_party_size: 4,
};
const BOOKED = {
  ...TILE, id: 'm1', number: '1', position_x: 20, position_y: 20,
  reserved_for: LONG, reserved_customer_id: 'cust-1',
  reserved_from: '2026-10-20T21:00:00', reserved_until: '2026-10-20T22:30:00',
};
const HELD_NO_TIME = {
  ...TILE, id: 'm2', number: '2', position_x: 140, position_y: 20,
  reserved_for: 'Pedro', reserved_customer_id: null,
  reserved_from: null, reserved_until: null,
};

beforeEach(() => {
  (globalThis as Record<string, unknown>).erplora = {
    query: async () => [],
    queryAll: async (name: string) =>
      (name === 'tables.zones.list' ? ZONAS : name === 'tables.tables.list' ? [BOOKED, HELD_NO_TIME] : []),
    queryPage: async () => ({ rows: [], total: 0 }),
    command: async () => ({}),
    on: () => () => {},
    locale: 'es',
    t: (_catalog: unknown, key: string, p?: Record<string, unknown>) => (p?.name ? `${key}:${p.name}` : key),
  };
});

type Floor = HTMLElement & { shadowRoot: ShadowRoot; updateComplete: Promise<unknown> };

async function openFloor(): Promise<Floor> {
  await import('./erp-tables-canvas');
  const el = document.createElement('erp-tables-canvas') as Floor;
  document.body.appendChild(el);
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
  return el;
}

async function rule(selector: string): Promise<string> {
  const el = await openFloor();
  const cssText = ((el.constructor as unknown as { styles: { cssText: string } }).styles).cssText;
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+');
  const m = cssText.match(new RegExp(`(?:^|[}\\s])${esc}\\s*\\{([^}]*)\\}`));
  expect(m, `rule «${selector}» exists`).not.toBeNull();
  return m![1];
}

describe('the floor plan keeps the reservation time whole (tables#129)', () => {
  it('the name and the time are separate pieces of the reservation line', async () => {
    const el = await openFloor();
    const hold = el.shadowRoot.querySelector(`[data-testid="tables-floor-tile-${BOOKED.id}"] .hold`);
    expect(hold, 'the reserved tile has its reservation line').toBeTruthy();
    const name = hold!.querySelector('.hold-name');
    const time = hold!.querySelector('.hold-time');
    expect(name?.textContent?.trim()).toBe(LONG);
    expect(time?.textContent?.trim()).toMatch(/^·\s*\d{2}:\d{2}$/);
    expect(name!.contains(time), 'the time is not inside the piece that gets clipped').toBe(false);
  });

  it('a hold without a time paints only the name', async () => {
    const el = await openFloor();
    const hold = el.shadowRoot.querySelector(`[data-testid="tables-floor-tile-${HELD_NO_TIME.id}"] .hold`);
    expect(hold?.querySelector('.hold-name')?.textContent?.trim()).toBe('Pedro');
    expect(hold?.querySelector('.hold-time')).toBeNull();
  });

  it('the line is a single centred row', async () => {
    const r = await rule('.mesa .hold');
    expect(r).toMatch(/display:\s*flex/);
    expect(r).toMatch(/justify-content:\s*center/);
    expect(r).toMatch(/white-space:\s*nowrap/);
    expect(r).not.toMatch(/text-overflow/);
  });

  it('only the name shrinks, clipped with an ellipsis', async () => {
    const r = await rule('.mesa .hold-name');
    expect(r).toMatch(/min-width:\s*0/);
    expect(r).toMatch(/overflow:\s*hidden/);
    expect(r).toMatch(/text-overflow:\s*ellipsis/);
  });

  it('the time never shrinks', async () => {
    const r = await rule('.mesa .hold-time');
    expect(r).toMatch(/flex:\s*none/);
  });
});
