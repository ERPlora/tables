// tables#126 (TABLES-F25) — «Choose table»: the reservation time is never clipped.
//
// The reserved tile painted «Name · 21:00» as ONE ellipsised line, so a name longer than ~12
// letters pushed the time past the edge («Luis Martínez …», «Cliente borrad…») on desktop, tablet
// and phone: the waiter saw the table was booked but not for when. Now the name and the time are
// two pieces of one row (the kit's truncated-title + fixed-tail row, as `ok-data-table`'s card
// head): the name shrinks with an ellipsis, the time keeps its width. happy-dom does no layout, so
// the rules are anchored as declared; the real fit is measured on the bench (hub:stable, ios+md,
// 1440x900 / 820x1180 / 375x667, `logs/tables-126/pos-probe.cjs`).
import { beforeEach, describe, expect, it } from 'vitest';

const ZONA = { id: 'z1', name: 'Salón' };
const LONG = 'Maximiliana Fernández de la Vega';
const BOOKED = {
  id: 'tbl-1', number: '1', zone_id: 'z1', capacity: 4, status: 'reserved',
  reserved_for: LONG, reserved_customer_id: 'cust-1', reserved_party_size: 4,
  reserved_from: '2026-10-20T21:00:00', reserved_until: '2026-10-20T22:30:00',
};
const HELD_NO_TIME = {
  id: 'tbl-2', number: '2', zone_id: 'z1', capacity: 4, status: 'reserved',
  reserved_for: 'Pedro', reserved_customer_id: null, reserved_party_size: 2,
  reserved_from: null, reserved_until: null,
};

beforeEach(() => {
  (globalThis as Record<string, unknown>).erplora = {
    query: async () => [],
    queryAll: async (name: string) => (name.includes('zone') ? [ZONA] : [BOOKED, HELD_NO_TIME]),
    command: async () => ({}),
    on: () => () => {},
    locale: 'es',
    t: (_catalog: unknown, key: string) => key,
  };
});

type Picker = HTMLElement & { shadowRoot: ShadowRoot; updateComplete: Promise<unknown> };

async function openPicker(): Promise<Picker> {
  await import('./erp-tables-pos-zones');
  const el = document.createElement('erp-tables-pos-zones') as Picker;
  document.body.appendChild(el);
  await el.updateComplete;
  el.shadowRoot.querySelector<HTMLElement>('ion-button.trigger')!.click();
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
  return el;
}

async function rule(selector: string): Promise<string> {
  const el = await openPicker();
  const cssText = ((el.constructor as unknown as { styles: { cssText: string } }).styles).cssText;
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+');
  const m = cssText.match(new RegExp(`(?:^|[}\\s])${esc}\\s*\\{([^}]*)\\}`));
  expect(m, `rule «${selector}» exists`).not.toBeNull();
  return m![1];
}

describe('«Choose table» keeps the reservation time whole (tables#126)', () => {
  it('the name and the time are separate pieces of the reservation line', async () => {
    const el = await openPicker();
    const hold = el.shadowRoot.querySelector(`[data-testid="tables-pos-table-${BOOKED.id}"] .hold`);
    expect(hold, 'the reserved tile has its reservation line').toBeTruthy();
    const name = hold!.querySelector('.hold-name');
    const time = hold!.querySelector('.hold-time');
    expect(name?.textContent?.trim()).toBe(LONG);
    expect(time?.textContent?.trim()).toMatch(/^·\s*\d{2}:\d{2}$/);
    expect(name!.contains(time), 'the time is not inside the piece that gets clipped').toBe(false);
  });

  it('a hold without a time paints only the name', async () => {
    const el = await openPicker();
    const hold = el.shadowRoot.querySelector(`[data-testid="tables-pos-table-${HELD_NO_TIME.id}"] .hold`);
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
