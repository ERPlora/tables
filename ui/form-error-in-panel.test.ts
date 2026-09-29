// pm#513 (out of pm#478) — on a phone or a tablet, a refused save in Zones or Tables showed NOTHING:
// the person pressed «Add zone», «Save changes» or «Add table» and the sheet stayed as it was.
//
// The refusal did arrive and was translated; it was painted in the wrong place. Both forms live in
// the `create` panel of their `ok-data-table`, and under 834 px that panel is a FULL-SCREEN sheet
// (`position: fixed; inset: 0`, outfitkit#75). The error banner was a child of the PAGE, so on a
// phone it sat under the sheet, out of sight (bench: hub:stable 1.1.30, 390 and 820 px, ios and md).
// On a desktop the panel sits beside the table and the banner happened to be visible.
//
// The rule, the same one customers#97 / services#115 / inventory#118 / appointments#227 follow:
//
//   · what goes wrong while SAVING the panel's form is painted INSIDE that form, next to the button
//     that was pressed, and scrolled into view once it has painted — it travels with the panel;
//   · what goes wrong OUTSIDE the save (a delete confirmed on the page, a list that does not load)
//     stays on the PAGE: no panel is open then, and a message inside a closed panel is just as
//     invisible (rv-appointments-227).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dataTableShowsLoadError } from '@erplora/module-sdk';

const ZONE = { id: 'z1', name: 'Terraza', description: 'Fuera', color: 'primary', sort_order: 0, is_active: 1, table_count: 0, available_tables_count: 0 };
const TABLE = { id: 't1', number: 'T1', name: '', capacity: 4, shape: 'square', status: 'available', is_active: 1, zone: null, zone_id: null };

/** A refusal whose text survives `domainMessage` as-is: a shell code carries a sentence for a person. */
const refusal = (): Error => Object.assign(new Error('A manager has to approve this.'), { code: 'hub.elevation.required' });

let refuse: Error | null = null;
/** When set, the next command waits on it: lets a test look at the screen while a save is in flight. */
let hold: Promise<void> | null = null;
let loadFails = false;
/** Every element the component scrolled into view AFTER it had painted itself. Scrolling a banner
 *  that has not rendered yet measures a 0-px box and leaves it half under the tab bar (staff#72). */
let revealed: Element[] = [];

beforeEach(() => {
  refuse = null;
  hold = null;
  loadFails = false;
  revealed = [];
  vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(function (this: HTMLElement) {
    if ((this as HTMLElement & { hasUpdated?: boolean }).hasUpdated !== false) revealed.push(this);
  });
  (globalThis as Record<string, unknown>).erplora = {
    query: async () => [],
    queryAll: async () => [ZONE],
    queryPage: async (name: string) => {
      if (loadFails) throw new Error('list down');
      return name === 'tables.zones.list' ? { rows: [ZONE], total: 1 } : { rows: [TABLE], total: 1 };
    },
    command: async () => {
      if (hold) await hold;
      if (refuse) throw refuse;
      return {};
    },
    on: () => () => {},
    hasPermission: () => true,
    locale: 'es',
    t: (_c: unknown, key: string) => key,
  };
});

type Wc = HTMLElement & { shadowRoot: ShadowRoot; updateComplete: Promise<unknown> } & Record<string, any>;

async function mount(tag: string): Promise<Wc> {
  if (tag === 'erp-tables-zones') await import('./components/erp-tables-zones/erp-tables-zones');
  else await import('./components/erp-tables-floor-plan/erp-tables-floor-plan');
  const el = document.createElement(tag) as Wc;
  document.body.appendChild(el);
  await settle(el);
  return el;
}

async function settle(el: Wc): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 0));
  }
}

const submitEvent = (): Event => new Event('submit', { cancelable: true });

/** The banner INSIDE the panel's form, or null. */
const inForm = (el: Wc, testid: string): Element | null =>
  el.shadowRoot.querySelector(`form[slot="create"] [data-testid="${testid}"]`);

/** The banner inside the form AND scrolled into view after it painted. */
const inFormAndRevealed = (el: Wc, testid: string): Element | null => {
  const banner = inForm(el, testid);
  return banner && revealed.includes(banner) ? banner : null;
};

/** The banner on the PAGE (outside the panel), or null. */
const onPage = (el: Wc, testid: string): Element | null => {
  const banner = el.shadowRoot.querySelector(`[data-testid="${testid}"]`);
  return banner && !banner.closest('form[slot="create"]') ? banner : null;
};

/** pm#533: an OutfitKit whose table paints the load error itself gets the reason there, and the page
 *  adds no banner of its own; an older one keeps the banner on the page. Never in the form. */
const expectLoadFailureOnPage = (el: Wc, banner: string): void => {
  if (dataTableShowsLoadError()) {
    expect((el.shadowRoot.querySelector('ok-data-table') as unknown as { error?: string }).error).toBe('list down');
    expect(el.shadowRoot.querySelector(`[data-testid="${banner}"]`), 'the reason would be said twice').toBeNull();
  } else {
    expect(onPage(el, banner)).not.toBeNull();
  }
};

const editZone = (el: Wc): Promise<void> => el.onRowAction({ detail: { actionId: 'edit', row: ZONE } });
const askDelete = (el: Wc): Promise<void> => el.onRowAction({ detail: { actionId: 'delete', row: ZONE } });

describe('pm#513 · zones: a refused save is shown INSIDE the panel form', () => {
  it('a refused «Add zone» lands in the form, with its text, scrolled into view', async () => {
    const el = await mount('erp-tables-zones');
    el.form = { ...el.form, name: 'Salón' };
    refuse = refusal();
    await el.submit(submitEvent());
    await settle(el);
    const banner = inForm(el, 'tables-zones-form-error');
    expect(banner, 'on a phone the panel covers the page: the refusal has to travel with the form').not.toBeNull();
    expect(inFormAndRevealed(el, 'tables-zones-form-error'), 'and it is scrolled into view').not.toBeNull();
    expect(banner?.textContent?.trim()).toBe('A manager has to approve this.');
    expect(onPage(el, 'tables-zones-error'), 'the page banner under the sheet stays empty').toBeNull();
  });

  it('a refused «Save changes» of an edited zone lands in the form too', async () => {
    const el = await mount('erp-tables-zones');
    await editZone(el);
    refuse = refusal();
    await el.submit(submitEvent());
    await settle(el);
    expect(inFormAndRevealed(el, 'tables-zones-form-error')).not.toBeNull();
    expect(onPage(el, 'tables-zones-error')).toBeNull();
  });

  it('a new attempt clears the previous refusal of the form', async () => {
    const el = await mount('erp-tables-zones');
    el.form = { ...el.form, name: 'Salón' };
    refuse = refusal();
    await el.submit(submitEvent());
    refuse = null;
    el.form = { ...el.form, name: 'Salón' };
    await el.submit(submitEvent());
    await settle(el);
    expect(inForm(el, 'tables-zones-form-error')).toBeNull();
  });

  it('while the new attempt is being saved, the previous refusal is already gone', async () => {
    const el = await mount('erp-tables-zones');
    el.form = { ...el.form, name: 'Salón' };
    refuse = refusal();
    await el.submit(submitEvent());
    refuse = null;
    let release!: () => void;
    hold = new Promise((r) => (release = r));
    const retry = el.submit(submitEvent());
    await settle(el);
    expect(inForm(el, 'tables-zones-form-error'), 'the old refusal must not sit next to a save in progress').toBeNull();
    release();
    await retry;
  });

  it('opening a zone to edit does not carry the refusal of an earlier save', async () => {
    const el = await mount('erp-tables-zones');
    el.form = { ...el.form, name: 'Salón' };
    refuse = refusal();
    await el.submit(submitEvent());
    await editZone(el);
    await settle(el);
    expect(inForm(el, 'tables-zones-form-error')).toBeNull();
  });
});

describe('pm#513 · zones: what goes wrong OUTSIDE the save stays on the page (rv-appointments-227)', () => {
  it('a refused delete (confirmed on the page, no panel open) is shown on the page, not in the form', async () => {
    const el = await mount('erp-tables-zones');
    await askDelete(el);
    refuse = refusal();
    await el.confirmDelete();
    await settle(el);
    expect(onPage(el, 'tables-zones-error')?.textContent?.trim()).toBe('A manager has to approve this.');
    expect(inForm(el, 'tables-zones-form-error')).toBeNull();
  });

  it('a list that does not load is shown on the page, not in the form', async () => {
    loadFails = true;
    const el = await mount('erp-tables-zones');
    expectLoadFailureOnPage(el, 'tables-zones-load-error');
    expect(inForm(el, 'tables-zones-form-error')).toBeNull();
    expect(inForm(el, 'tables-zones-load-error')).toBeNull();
  });

  it('opening the panel after a refused delete does not carry that page error into the form', async () => {
    const el = await mount('erp-tables-zones');
    await askDelete(el);
    refuse = refusal();
    await el.confirmDelete();
    await editZone(el);
    await settle(el);
    expect(inForm(el, 'tables-zones-form-error')).toBeNull();
  });

  it('the page error of a refused delete goes away once a later save succeeds', async () => {
    const el = await mount('erp-tables-zones');
    await askDelete(el);
    refuse = refusal();
    await el.confirmDelete();
    refuse = null;
    el.form = { ...el.form, name: 'Salón' };
    await el.submit(submitEvent());
    await settle(el);
    expect(onPage(el, 'tables-zones-error'), 'a stale refusal must not stay red after a save that worked').toBeNull();
  });

  it('asking to delete a zone again hides the previous refusal until the new answer arrives', async () => {
    const el = await mount('erp-tables-zones');
    await askDelete(el);
    refuse = refusal();
    await el.confirmDelete();
    await askDelete(el);
    await settle(el);
    expect(onPage(el, 'tables-zones-error')).toBeNull();
  });

  it('retrying the refused delete clears the refusal once it succeeds', async () => {
    const el = await mount('erp-tables-zones');
    await askDelete(el);
    refuse = refusal();
    await el.confirmDelete();
    refuse = null;
    el.deleteTarget = ZONE;
    await el.confirmDelete();
    await settle(el);
    expect(onPage(el, 'tables-zones-error')).toBeNull();
  });
});

describe('pm#513 · tables list: a refused «Add table» is shown INSIDE the panel form', () => {
  it('the refusal lands in the create form, with its text, scrolled into view', async () => {
    const el = await mount('erp-tables-floor-plan');
    el.newNumber = 'T9';
    refuse = refusal();
    await el.createTable(submitEvent());
    await settle(el);
    const banner = inForm(el, 'tables-list-error');
    expect(banner, 'on a phone the panel covers the page: the refusal has to travel with the form').not.toBeNull();
    expect(inFormAndRevealed(el, 'tables-list-error'), 'and it is scrolled into view').not.toBeNull();
    expect(banner?.textContent?.trim()).toBe('A manager has to approve this.');
  });

  it('a new attempt clears the previous refusal', async () => {
    const el = await mount('erp-tables-floor-plan');
    el.newNumber = 'T9';
    refuse = refusal();
    await el.createTable(submitEvent());
    refuse = null;
    el.newNumber = 'T9';
    await el.createTable(submitEvent());
    await settle(el);
    expect(el.shadowRoot.querySelector('[data-testid="tables-list-error"]')).toBeNull();
  });

  it('a list that does not load stays on the page, not in the form (rv-appointments-227)', async () => {
    loadFails = true;
    const el = await mount('erp-tables-floor-plan');
    expectLoadFailureOnPage(el, 'tables-list-load-error');
    expect(inForm(el, 'tables-list-load-error')).toBeNull();
    expect(inForm(el, 'tables-list-error')).toBeNull();
  });
});
