// pm#637 (TABLES-F31) — the floor plan after the customer of a reservation was erased.
//
// The hold keeps the table reserved and its time, but its name was emptied by
// `customer.anonymized`. The tile keeps its reservation line and reads «Deleted customer» in the
// reader's language — on screen, in the tooltip and in the accessible name.
import { beforeEach, describe, expect, it } from 'vitest';

const ZONAS = [{ id: 'z1', name: 'Salón', color: '#00f', sort_order: 1, is_active: 1 }];
const MESA = {
  id: 'm1', number: '1', name: '', capacity: 4, shape: 'square', status: 'reserved', is_active: 1,
  zone_id: 'z1', position_x: 20, position_y: 20, width: 80, height: 80,
  reserved_for: '', reserved_customer_id: 'cust-ana', reserved_party_size: 4,
  reserved_from: '2026-10-20T21:00:00', reserved_until: '2026-10-20T22:30:00',
};

beforeEach(() => {
  (globalThis as Record<string, unknown>).erplora = {
    query: async () => [],
    queryAll: async (name: string) => (name === 'tables.zones.list' ? ZONAS : name === 'tables.tables.list' ? [MESA] : []),
    queryPage: async () => ({ rows: [], total: 0 }),
    command: async () => ({}),
    on: () => () => {},
    locale: 'es',
    t: (_catalog: unknown, key: string, p?: Record<string, unknown>) => (p?.name ? `${key}:${p.name}` : key),
  };
});

describe('the floor plan with an erased customer (pm#637)', () => {
  it('the reserved tile says «Deleted customer» and keeps the time', async () => {
    await import('./erp-tables-canvas');
    const el = document.createElement('erp-tables-canvas') as HTMLElement & {
      shadowRoot: ShadowRoot; updateComplete: Promise<unknown>;
    };
    document.body.appendChild(el);
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 0));
    await el.updateComplete;

    const tile = el.shadowRoot.querySelector('[data-testid="tables-floor-tile-m1"]');
    expect(tile, 'the tile is painted').toBeTruthy();
    const hold = tile?.querySelector('.hold');
    expect(hold, 'the reservation line stays on the tile').toBeTruthy();
    expect(hold?.textContent).toContain('ui.erasedCustomer');
    expect(hold?.textContent).toMatch(/\d{2}:\d{2}/);
    expect(tile?.getAttribute('title') ?? '').toContain('ui.reservedFor:ui.erasedCustomer');
    expect(tile?.getAttribute('aria-label') ?? '').toContain('ui.reservedFor:ui.erasedCustomer');
  });
});
