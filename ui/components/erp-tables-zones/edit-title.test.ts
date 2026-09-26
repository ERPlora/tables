// pm#450 (outfitkit#150): editing a zone reused the ALTA panel with open('create'), so its header
// said «New» while the form held an existing zone — and saving UPDATES it. The table now has an
// «edit» mode and takes the whole header title: the screen asks for open('edit', { title }) with
// «Edit zone · <name>».
//
// Fallback for shells with OutfitKit < 0.1.94 (hub:stable 1.1.29 ships 0.1.73): they ignore the
// title and paint `labels.newRecord` for the «edit» panel, so the screen overrides `newRecord` with
// the same «Edit zone · <name>» while editing — the header is right on every shell. This screen
// never painted an «Editing …» line in the form body, so there is no body line to drop.
import { beforeEach, describe, expect, it } from 'vitest';
import enLocale from '../../../locales/en.json';
import esLocale from '../../../locales/es.json';

const ZONES = [
  { id: 'z1', name: 'Terraza', description: '', color: 'success', sort_order: 1, is_active: 1, table_count: 4, available_tables_count: 3 },
];

beforeEach(() => {
  (globalThis as Record<string, unknown>).erplora = {
    query: async () => [],
    queryAll: async () => [],
    queryPage: async () => ({ rows: ZONES, total: ZONES.length }),
    command: async () => ({}),
    on: () => () => {},
    hasPermission: () => true,
    locale: 'es',
    // Returns the key with its interpolated params, to assert WHICH one was used and with what.
    t: (_c: unknown, key: string, params?: Record<string, unknown>) =>
      params ? `${key}(${Object.entries(params).map(([k, v]) => `${k}=${v}`).join(',')})` : key,
  };
});

type Mounted = HTMLElement & {
  shadowRoot: ShadowRoot;
  updateComplete: Promise<unknown>;
  editingId: string | null;
  form: { name: string; color: string; sortOrder: string; isActive: boolean };
  onRowAction: (ev: CustomEvent<{ actionId: string; row: Record<string, unknown> }>) => Promise<void>;
};
type Table = HTMLElement & {
  open: (panel?: unknown, opts?: { title?: string }) => void;
  close: () => void;
  panel?: string | null;
  labels?: { newRecord?: string };
  shadowRoot: ShadowRoot;
};

async function mount(): Promise<Mounted> {
  await import('./erp-tables-zones');
  const el = document.createElement('erp-tables-zones') as Mounted;
  document.body.appendChild(el);
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
  return el;
}

const table = (el: Mounted) => el.shadowRoot.querySelector('ok-data-table') as unknown as Table;
const addButton = (el: Mounted) => table(el).shadowRoot.querySelector('[data-testid="tables-zones-table-add"]') as HTMLElement;

async function edit(el: Mounted): Promise<void> {
  await el.onRowAction(new CustomEvent('rowAction', { detail: { actionId: 'edit', row: ZONES[0] } }));
  await el.updateComplete;
}

describe('editing a zone titles the panel «Edit zone · <name>» (pm#450)', () => {
  it("opens the panel with open('edit', { title })", async () => {
    const el = await mount();
    const calls: unknown[][] = [];
    table(el).open = (...args: unknown[]) => void calls.push(args);
    await edit(el);
    expect(calls).toEqual([['edit', { title: 'ui.panelEditZone(name=Terraza)' }]]);
  });

  it('creating keeps the «New» header of the shared data-table labels', async () => {
    const el = await mount();
    expect(el.editingId).toBeNull();
    expect(table(el).labels?.newRecord).toBe('Nuevo');
  });

  it('an older shell (title ignored) still reads «Edit zone · <name>»: newRecord is overridden while editing', async () => {
    const el = await mount();
    await edit(el);
    expect(table(el).labels?.newRecord, 'OutfitKit < 0.1.94 would say «New» over an edit').toBe(
      'ui.panelEditZone(name=Terraza)',
    );
  });

  it('«Add» after an edit opens a CLEAN create form (the header says «New»: the form must agree)', async () => {
    const el = await mount();
    await edit(el);
    expect(addButton(el), 'the table paints its «Add» button').toBeTruthy();
    addButton(el).click();
    await el.updateComplete;
    expect(el.editingId, 'a submit here would UPDATE the edited zone under a «New» header').toBeNull();
    expect(el.form.name).toBe('');
    expect(table(el).labels?.newRecord).toBe('Nuevo');
    expect(table(el).panel, '«Add» just opened the panel: resetting the form must not close it').toBe('create');
  });

  it('a click INSIDE the edit form (a field, the table) does not drop the edit — only «Add» does', async () => {
    const el = await mount();
    await edit(el);
    (el.shadowRoot.querySelector('[data-testid="tables-zones-name"]') as HTMLElement).click();
    table(el).click();
    await el.updateComplete;
    expect(el.editingId, 'the table host hears every click of the projected form').toBe('z1');
  });

  it('«Add» with no edit in progress keeps what was typed', async () => {
    const el = await mount();
    el.form = { ...el.form, name: 'Barra' };
    addButton(el).click();
    await el.updateComplete;
    expect(el.form.name).toBe('Barra');
  });

  it('«Cancel» on an edit closes the panel: a clean form must not sit under the «Edit zone» header', async () => {
    const el = await mount();
    await edit(el);
    let closed = 0;
    table(el).close = () => void closed++;
    (el.shadowRoot.querySelector('[data-testid="tables-zones-cancel"]') as HTMLElement).click();
    await el.updateComplete;
    expect(el.editingId).toBeNull();
    expect(closed).toBe(1);
  });
});

describe('the edit title is translated in both locales of the module (pm#450)', () => {
  const catalogs: Record<string, { ui: Record<string, string> }> = { en: enLocale, es: esLocale };

  it.each(['en', 'es'])('%s carries ui.panelEditZone with the {name} of the zone', (lang) => {
    expect(catalogs[lang].ui.panelEditZone, `${lang}.json lacks ui.panelEditZone`).toContain('{name}');
  });
});
