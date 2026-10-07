// pm#637 (TABLES-F31) — «Choose table» after the customer of a reservation was erased.
//
// The hold keeps the table reserved and its time, but its name was emptied by
// `customer.anonymized`. The cell must not drop the reservation line (the waiter still needs to
// know the table is booked and when): it reads «Deleted customer» in the reader's language.
import { beforeEach, describe, expect, it } from 'vitest';

const ZONA = { id: 'z1', name: 'Terraza' };
const MESA = {
  id: 'tbl-1', number: '4', zone_id: 'z1', capacity: 4, status: 'reserved',
  reserved_for: '', reserved_customer_id: 'cust-ana', reserved_party_size: 4,
  reserved_from: '2026-10-20T21:00:00', reserved_until: '2026-10-20T22:30:00',
};

beforeEach(() => {
  (globalThis as Record<string, unknown>).erplora = {
    query: async () => [],
    queryAll: async (name: string) => (name.includes('zone') ? [ZONA] : [MESA]),
    command: async () => ({}),
    on: () => () => {},
    locale: 'es',
    t: (_catalog: unknown, key: string, p?: Record<string, unknown>) => (p?.name ? `${key}:${p.name}` : key),
  };
});

async function openPicker() {
  await import('./erp-tables-pos-zones');
  const el = document.createElement('erp-tables-pos-zones') as HTMLElement & {
    shadowRoot: ShadowRoot; updateComplete: Promise<unknown>;
  };
  document.body.appendChild(el);
  await el.updateComplete;
  el.shadowRoot.querySelector<HTMLElement>('ion-button.trigger')!.click();
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
  return el;
}

describe('«Choose table» with an erased customer (pm#637)', () => {
  it('the reserved cell says «Deleted customer» and keeps the time', async () => {
    const el = await openPicker();
    const mesa = el.shadowRoot.querySelector('.mesa');
    const hold = mesa?.querySelector('.hold');
    expect(hold, 'the reservation line stays on the cell').toBeTruthy();
    expect(hold?.textContent).toContain('ui.erasedCustomer');
    expect(hold?.textContent).toMatch(/\d{2}:\d{2}/);
    expect(mesa?.getAttribute('title') ?? '').toContain('ui.erasedCustomer (4)');
  });
});
