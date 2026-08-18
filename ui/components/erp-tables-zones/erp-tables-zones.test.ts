// Contract of the ZONES view (tables#3 a · tables#4).
//
// Until now `/m/tables/zones` mounted the table list (`erp-tables-floor-plan`) — a false door. The
// market (Square "Sections", Toast "Service areas", Lightspeed "Floor plans", Clover/Revel/
// TouchBistro "Sections", Odoo "Floors" in the backend) manages sections as a back-office LIST with
// create / rename / order / activate and the tables each section holds. So this view is a data
// table of zones with their occupancy (`table_count`, `available_tables_count` from the query),
// the create panel behind the «+» of the table (parity with /employees, inventory categories), row
// actions edit / delete, and a confirmation before deleting.
import { beforeEach, describe, expect, it } from 'vitest';

const ZONES = [
  { id: 'z1', name: 'Terraza', description: '', color: 'success', sort_order: 1, is_active: 1, table_count: 4, available_tables_count: 3 },
  { id: 'z2', name: 'Salón', description: 'Interior', color: 'primary', sort_order: 2, is_active: 0, table_count: 0, available_tables_count: 0 },
];

const commands: { name: string; payload: Record<string, unknown> }[] = [];
let failNext: string | null = null;

beforeEach(() => {
  commands.length = 0;
  failNext = null;
  (globalThis as Record<string, unknown>).erplora = {
    query: async () => [],
    queryAll: async () => [],
    queryPage: async () => ({ rows: ZONES, total: ZONES.length }),
    command: async (name: string, payload: Record<string, unknown>) => {
      commands.push({ name, payload });
      if (failNext === name) throw new Error('tables.zone_has_tables');
      return {};
    },
    on: () => () => {},
    hasPermission: () => true,
    locale: 'es',
    t: (_catalog: unknown, key: string) => key,
  };
});

type Wc = HTMLElement & {
  shadowRoot: ShadowRoot;
  updateComplete: Promise<unknown>;
  columns: { key: string; filterType?: string; options?: { value: unknown }[] }[];
  actions: { id: string }[];
  form: { name: string; color: string; sortOrder: string; isActive: boolean };
  editingId: string | null;
  deleteTarget: { id: string; name: string } | null;
  submit: (ev: Event) => Promise<void>;
  onRowAction: (ev: CustomEvent<{ actionId: string; row: Record<string, unknown> }>) => Promise<void>;
  confirmDelete: () => Promise<void>;
};

async function mount(): Promise<Wc> {
  await import('./erp-tables-zones');
  const el = document.createElement('erp-tables-zones') as Wc;
  document.body.appendChild(el);
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
  return el;
}

const table = (el: Wc) =>
  el.shadowRoot.querySelector('ok-data-table') as
    | (HTMLElement & { addable: boolean; fill: boolean; rows: unknown[]; open: (p?: string) => void; close: () => void })
    | null;

describe('the zones view is a list of ZONES, not of tables', () => {
  it('lists the zones returned by tables.zones.list', async () => {
    const el = await mount();
    expect(table(el), 'no ok-data-table').toBeTruthy();
    expect(table(el)!.rows.length).toBe(2);
    expect(table(el)!.addable).toBe(true);
    expect(table(el)!.fill).toBe(true);
  });

  it('shows the occupancy of each zone: total tables and available tables (tables#4)', async () => {
    const el = await mount();
    const keys = el.columns.map((c) => c.key);
    expect(keys).toContain('table_count');
    expect(keys).toContain('available_tables_count');
  });

  it('exposes name, order and active state as columns; the active filter is a select', async () => {
    const el = await mount();
    const keys = el.columns.map((c) => c.key);
    expect(keys).toContain('name');
    expect(keys).toContain('sort_order');
    const active = el.columns.find((c) => c.key === 'is_active');
    expect(active?.filterType).toBe('select');
    // The runtime filters `eq` over CAST(... AS TEXT): the select sends strings.
    expect(active?.options?.map((o) => o.value)).toEqual(['1', '0']);
  });

  it('offers edit and delete as row actions', async () => {
    const el = await mount();
    expect(el.actions.map((a) => a.id)).toEqual(['edit', 'delete']);
  });
});

describe('create lives behind the «+» of the table', () => {
  it('projects the form in the `create` slot and no control outside the table', async () => {
    const el = await mount();
    const form = el.shadowRoot.querySelector('form[slot="create"]');
    expect(form?.closest('ok-data-table')).toBeTruthy();
    const loose = [...el.shadowRoot.querySelectorAll('form, ion-input, ion-select, ion-toggle')].filter(
      (n) => !n.closest('ok-data-table') && !n.closest('ion-modal'),
    );
    expect(loose.map((n) => n.tagName.toLowerCase())).toEqual([]);
  });

  it('submit sends tables.zones.create with the full payload of the schema and closes the panel', async () => {
    const el = await mount();
    let closed = 0;
    table(el)!.close = () => {
      closed += 1;
    };
    el.form = { name: '  Barra ', color: 'warning', sortOrder: '3', isActive: true };
    await el.submit(new Event('submit'));
    const c = commands.find((x) => x.name === 'tables.zones.create');
    expect(c, 'zones.create was not sent').toBeTruthy();
    expect(c!.payload).toEqual({ name: 'Barra', description: '', color: 'warning', sort_order: 3 });
    expect(closed).toBe(1);
  });

  it('a new zone defaults its order to the end of the list', async () => {
    const el = await mount();
    expect(Number(el.form.sortOrder)).toBe(3);
  });
});

describe('edit reuses the panel and sends the whole zone (rename / colour / order / active)', () => {
  it('the edit action pre-fills the form and opens the panel', async () => {
    const el = await mount();
    let opened: string | undefined;
    table(el)!.open = (p?: string) => {
      opened = p;
    };
    await el.onRowAction(new CustomEvent('rowAction', { detail: { actionId: 'edit', row: ZONES[1] } }));
    expect(el.editingId).toBe('z2');
    expect(el.form.name).toBe('Salón');
    expect(el.form.color).toBe('primary');
    expect(el.form.sortOrder).toBe('2');
    expect(el.form.isActive).toBe(false);
    expect(opened).toBe('create');
  });

  it('submit in edit mode sends tables.zones.update with zone_id, keeps the description and toggles is_active', async () => {
    const el = await mount();
    table(el)!.open = () => {};
    await el.onRowAction(new CustomEvent('rowAction', { detail: { actionId: 'edit', row: ZONES[1] } }));
    el.form = { ...el.form, name: 'Salón interior', isActive: true };
    await el.submit(new Event('submit'));
    const c = commands.find((x) => x.name === 'tables.zones.update');
    expect(c, 'zones.update was not sent').toBeTruthy();
    expect(c!.payload).toEqual({
      zone_id: 'z2',
      name: 'Salón interior',
      description: 'Interior',
      color: 'primary',
      sort_order: 2,
      is_active: 1,
    });
    expect(commands.some((x) => x.name === 'tables.zones.create'), 'edit must never create a duplicate').toBe(false);
    expect(el.editingId).toBeNull();
  });
});

describe('delete asks first and reports the domain error', () => {
  it('the delete action does NOT delete: it arms the confirmation', async () => {
    const el = await mount();
    await el.onRowAction(new CustomEvent('rowAction', { detail: { actionId: 'delete', row: ZONES[0] } }));
    expect(commands.length).toBe(0);
    expect(el.deleteTarget?.id).toBe('z1');
  });

  it('confirming sends tables.zones.delete', async () => {
    const el = await mount();
    await el.onRowAction(new CustomEvent('rowAction', { detail: { actionId: 'delete', row: ZONES[0] } }));
    await el.confirmDelete();
    expect(commands.map((c) => c.name)).toEqual(['tables.zones.delete']);
    expect(commands[0].payload).toEqual({ zone_id: 'z1' });
    expect(el.deleteTarget).toBeNull();
  });

  it('a zone with tables is refused by the runtime and the view shows the error instead of swallowing it', async () => {
    const el = await mount();
    failNext = 'tables.zones.delete';
    await el.onRowAction(new CustomEvent('rowAction', { detail: { actionId: 'delete', row: ZONES[0] } }));
    await el.confirmDelete();
    await el.updateComplete;
    const fb = el.shadowRoot.querySelector('ok-inline-feedback[tone="danger"]');
    expect(fb?.textContent).toContain('tables.zone_has_tables');
  });
});
