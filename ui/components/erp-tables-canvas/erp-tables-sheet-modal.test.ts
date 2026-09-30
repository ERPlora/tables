// Where the floor plan's SHEETS («Add», «Edit table», «Edit zone») are painted — tables#107.
//
// The symptom, on a computer with the side menu open (1440x900, hub:stable 1.1.30, ios and md):
// tapping a table opened «Edit table» shifted to the right, and the dim layer started at x=480
// instead of x=0 — a light strip over the plan through which the tables behind could still be
// tapped. Tablet and phone looked fine.
//
// The sheets were a `.scrim { position:fixed }` INSIDE this component's shadow root. A module never
// owns the viewport: an ancestor of the shell (transform/contain) turns `position:fixed` into
// «relative to its own box», so the scrim's `left` (the ion-content's 240 px, measured against the
// viewport by tables#88's placeScrim) was added to the 240 px where that box already starts.
// tables#88 had anchored the scrim to the ion-content box because, centred on the viewport, the foot
// of the sheet landed on the module tab bar, which ate the tap.
//
// The fix is the hub's standard window, the one Sessions and Zones of this module already use: an
// `ion-modal`. The shell reparents an open modal to `ion-app` (measured on the bench: parent
// ION-APP, backdrop 0..1440 x 0..900, wrapper centred at x=720), above the side menu AND the tab
// bar, so both bugs are gone by construction. A native <dialog> (top layer) is not an option: these
// sheets hold `ion-select`s whose popovers live in `ion-app` and would open BEHIND the dialog.
//
// What moves with the modal leaves this shadow root, so the component's `static styles` stop
// reaching it: the sheet may only rely on Ionic's own layout and on inline custom properties.
import { beforeEach, describe, expect, it } from 'vitest';

type Canvas = HTMLElement & {
  shadowRoot: ShadowRoot; updateComplete: Promise<unknown>; addOpen: boolean;
  edit?: Record<string, unknown>; zoneEdit?: Record<string, unknown>;
};

const ZONES = [{ id: 'z1', name: 'Hall', description: '', color: '#00f', sort_order: 1, is_active: 1 }];
const TABLES = [
  { id: 'm1', number: '1', name: '', capacity: 4, shape: 'square', status: 'available', is_active: 1, zone_id: 'z1', position_x: 10, position_y: 10, width: 72, height: 72 },
  { id: 'm2', number: '2', name: '', capacity: 2, shape: 'round', status: 'available', is_active: 1, zone_id: 'z1', position_x: 120, position_y: 10, width: 72, height: 72 },
];

beforeEach(() => {
  (globalThis as Record<string, unknown>).erplora = {
    query: async (n: string) => (n === 'tables.zones.get' ? ZONES[0] : []),
    queryAll: async (n: string) => (n === 'tables.zones.list' ? ZONES : n === 'tables.tables.list' ? TABLES : []),
    queryPage: async () => ({ rows: [], total: 0 }), command: async () => ({}),
    on: () => () => {}, locale: 'en', t: (_c: unknown, k: string) => k,
  };
  document.body.replaceChildren();
});

async function settle(el: Canvas): Promise<void> {
  for (let i = 0; i < 4; i++) { await el.updateComplete; await new Promise((r) => setTimeout(r, 0)); }
}

async function mount(): Promise<Canvas> {
  await import('./erp-tables-canvas');
  const el = document.createElement('erp-tables-canvas') as Canvas;
  document.body.appendChild(el);
  await settle(el);
  return el;
}

const byTestId = (el: Canvas, id: string) => el.shadowRoot.querySelector<HTMLElement>(`[data-testid="${id}"]`);

/** Opens each sheet the way a person does. */
const OPEN: Array<[string, string, (el: Canvas) => Promise<void>]> = [
  ['add', 'tables-floor-add-sheet', async (el) => { byTestId(el, 'tables-floor-add')!.click(); await settle(el); }],
  ['edit table', 'tables-floor-table-sheet', async (el) => {
    byTestId(el, 'tables-floor-tile-m1')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await settle(el);
  }],
  ['edit zone', 'tables-floor-zone-sheet', async (el) => { byTestId(el, 'tables-floor-zone-edit')!.click(); await settle(el); }],
];

/** The CSS the component declares (Lit's `static styles`). */
function componentCss(): string {
  const ctor = customElements.get('erp-tables-canvas') as unknown as { styles: { cssText: string } | Array<{ cssText: string }> };
  return [ctor.styles].flat().map((s) => s.cssText).join('\n');
}

describe('the floor plan sheets open in the hub\'s standard window, over the WHOLE screen (tables#107)', () => {
  it.each(OPEN)('«%s» lives inside an open ion-modal, not in a dim layer of the plan', async (_n, testid, open) => {
    const el = await mount();
    await open(el);

    const sheet = byTestId(el, testid);
    expect(sheet, 'the sheet opened').not.toBeNull();
    const modal = sheet!.closest('ion-modal') as (HTMLElement & { isOpen?: boolean }) | null;
    expect(modal, 'the sheet is painted inside the plan\'s own shadow root, where position:fixed is not the screen').not.toBeNull();
    expect(modal!.isOpen, 'the modal that holds it is open').toBe(true);
    expect(el.shadowRoot.querySelector('.scrim'), 'the old in-plan scrim is gone').toBeNull();
  });

  it('no rule of the component pins anything with position:fixed (it is never the screen inside a module)', async () => {
    await import('./erp-tables-canvas');
    expect(componentCss()).not.toMatch(/position\s*:\s*fixed/);
  });

  it.each(OPEN)('«%s» does not rely on the component styles, which never reach a reparented modal', async (_n, testid, open) => {
    const el = await mount();
    await open(el);
    const modal = byTestId(el, testid)!.closest('ion-modal')!;
    const css = componentCss();
    const classes = new Set<string>();
    for (const node of [modal, ...modal.querySelectorAll('*')]) for (const c of node.classList) classes.add(c);
    const styledHere = [...classes].filter((c) => new RegExp(`\\.${c.replace(/[-]/g, '\\-')}(?![\\w-])`).test(css));
    expect(styledHere, 'these classes are painted by static styles that the modal leaves behind').toEqual([]);
  });

  it.each([
    ['add', 0, (el: Canvas) => el.addOpen],
    ['edit table', 1, (el: Canvas) => !!el.edit],
    ['edit zone', 2, (el: Canvas) => !!el.zoneEdit],
  ] as const)('«%s» closed by the backdrop, Escape or a swipe (ionModalDidDismiss) can be opened again', async (_n, i, isOpen) => {
    const [, testid, open] = OPEN[i];
    const el = await mount();
    await open(el);
    const modal = byTestId(el, testid)!.closest('ion-modal')!;

    modal.dispatchEvent(new CustomEvent('ionModalDidDismiss', { bubbles: true }));
    await settle(el);
    expect(isOpen(el), 'Ionic closed the window but the plan still thinks it is open').toBe(false);
    expect((modal as HTMLElement & { isOpen?: boolean }).isOpen, 'the modal is told it is closed').toBe(false);

    await open(el);
    expect(byTestId(el, testid)?.closest('ion-modal'), 'the next tap opens it again').not.toBeNull();
    expect((byTestId(el, testid)!.closest('ion-modal') as HTMLElement & { isOpen?: boolean }).isOpen).toBe(true);
  });

  // Ionic 8 presents an inline modal by MOVING all its element children into a new
  // `div.ion-delegate-host` (unless its first child already is one) before teleporting it to ion-app
  // (@ionic/core utils/framework-delegate.js, CoreDelegate.attachViewToDom). Lit's markers of a
  // conditional stay behind as comments of the ion-modal, so a sheet rendered straight into the
  // modal can no longer be removed on close: on the bench (hub:dev) the second table tapped opened
  // with the FIRST table's sheet on top of it, and its «Delete» deleted the table the person had
  // just tapped. happy-dom has no Ionic, so the move is replayed here.
  const presentLikeIonic = (modal: Element): void => {
    if (!modal.children.length || modal.children[0].classList.contains('ion-delegate-host')) return;
    const host = document.createElement('div');
    host.classList.add('ion-delegate-host', 'ion-page');
    host.append(...modal.children);
    modal.appendChild(host);
  };

  it.each(OPEN)('«%s» presented by Ionic, closed and opened again holds ONE sheet, not the old one too', async (_n, testid, open) => {
    const el = await mount();
    for (let round = 0; round < 3; round++) {
      await open(el);
      const modal = byTestId(el, testid)!.closest('ion-modal')!;
      presentLikeIonic(modal);
      expect(modal.querySelectorAll(`[data-testid="${testid}"]`).length, `open #${round + 1}: a sheet left over from an earlier open`).toBe(1);
      modal.dispatchEvent(new CustomEvent('ionModalDidDismiss', { bubbles: true }));
      await settle(el);
      expect(modal.querySelectorAll(`[data-testid="${testid}"]`).length, `close #${round + 1}: the sheet outlived its window`).toBe(0);
    }
  });

  it('«Edit table» presented by Ionic and opened again on ANOTHER table shows only that table', async () => {
    const el = await mount();
    await OPEN[1][2](el);
    const modal = byTestId(el, 'tables-floor-table-sheet')!.closest('ion-modal')!;
    presentLikeIonic(modal);
    byTestId(el, 'tables-floor-table-close')!.click();
    await settle(el);

    byTestId(el, 'tables-floor-tile-m2')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await settle(el);
    presentLikeIonic(modal);
    const numbers = [...modal.querySelectorAll<HTMLElement & { value?: string }>('[data-testid="tables-floor-table-number"]')].map((n) => n.value);
    expect(numbers, 'the window shows a table the person did not tap').toEqual(['2']);
  });

  it('closing «Edit table» by the backdrop and tapping ANOTHER table opens that table', async () => {
    const el = await mount();
    await OPEN[1][2](el);
    byTestId(el, 'tables-floor-table-sheet')!.closest('ion-modal')!
      .dispatchEvent(new CustomEvent('ionModalDidDismiss', { bubbles: true }));
    await settle(el);

    byTestId(el, 'tables-floor-tile-m2')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await settle(el);
    expect(el.edit?.id).toBe('m2');
    const number = byTestId(el, 'tables-floor-table-number') as HTMLElement & { value?: string };
    expect(number?.value, 'the sheet shows the table that was tapped').toBe('2');
  });

  it('a dismiss of the modal that belongs to ANOTHER sheet does not close the one on screen', async () => {
    const el = await mount();
    await OPEN[1][2](el);
    const zoneModal = el.shadowRoot.querySelector('[data-testid="tables-floor-zone-modal"]');
    expect(zoneModal, 'each sheet has its own modal').not.toBeNull();
    zoneModal!.dispatchEvent(new CustomEvent('ionModalDidDismiss', { bubbles: true }));
    await settle(el);
    expect(el.edit?.id, 'a stray dismiss closed «Edit table»').toBe('m1');
  });

  it.each(OPEN)('«%s» ignores a dismiss that bubbles up from an overlay opened INSIDE it', async (_n, testid, open) => {
    const el = await mount();
    await open(el);
    const modal = byTestId(el, testid)!.closest('ion-modal') as HTMLElement & { isOpen?: boolean };
    // Ionic's overlay events bubble: a picker opened from a field of the sheet would close the sheet.
    modal.querySelector('ion-input, ion-select')!
      .dispatchEvent(new CustomEvent('ionModalDidDismiss', { bubbles: true, composed: true }));
    await settle(el);
    expect(modal.isOpen, 'a nested overlay closed the sheet under the person').toBe(true);
    expect(byTestId(el, testid), 'the sheet lost its content').not.toBeNull();
  });

  // Measured on the bench (hub:stable 1.1.30): an ion-col paints NO gutter in the hub shell (padding
  // 0 even with --ion-grid-column-padding set), so the outlined fields touched each other edge to
  // edge; and the shell imports only core, structure, typography, padding and flex-utils of Ionic's
  // global CSS (hub apps/web/src/main.ts) — `ion-text-end` did nothing and «Add zone» sat on the
  // left. The sheet spaces itself with what the shell does load, and inline properties. `ion-page`
  // (the frame of each sheet) comes with core.css.
  const SHELL_UTILITIES = /^ion-(no-)?(padding|margin)(-(top|bottom|start|end|horizontal|vertical))?$|^ion-(justify-content|align-items|align-self)-[a-z-]+$|^ion-no-border$|^ion-page$/;
  it.each(OPEN)('«%s» uses only the Ionic utility classes the hub shell loads', async (_n, testid, open) => {
    const el = await mount();
    await open(el);
    const modal = byTestId(el, testid)!.closest('ion-modal')!;
    const used = new Set<string>();
    for (const node of [modal, ...modal.querySelectorAll('*')]) for (const c of node.classList) if (c.startsWith('ion-')) used.add(c);
    expect([...used].filter((c) => !SHELL_UTILITIES.test(c)), 'a class the shell never paints').toEqual([]);
    expect(modal.querySelector('ion-grid'), 'a grid whose gutter the shell does not paint').toBeNull();
  });

  it.each(OPEN)('«%s» separates its fields: rows apart, and two fields on one row apart', async (_n, testid, open) => {
    const el = await mount();
    await open(el);
    const rows = [...byTestId(el, testid)!.querySelectorAll<HTMLElement>('ion-row')].filter((r) => r.querySelector('ion-input, ion-select'));
    expect(rows.length, 'the fields are laid out in rows').toBeGreaterThan(1);
    for (const row of rows.slice(0, -1)) {
      const next = row.nextElementSibling as HTMLElement | null;
      const apart = row.classList.contains('ion-margin-bottom') || !!next?.classList.contains('ion-margin-top');
      expect(apart, 'a row of fields glued to what follows it').toBe(true);
    }
    const pairs = rows.map((r) => [...r.children].filter((c) => c.tagName === 'ION-COL')).filter((cols) => cols.length === 2);
    if (testid === 'tables-floor-table-sheet') expect(pairs.length, 'the table sheet has fields side by side').toBeGreaterThan(0);
    for (const [first, second] of pairs) {
      expect(first.getAttribute('style') ?? '', 'the first field of a pair keeps its distance').toMatch(/padding-inline-end:\s*\d/);
      expect(second.getAttribute('style') ?? '', 'the second field of a pair keeps its distance').toMatch(/padding-inline-start:\s*\d/);
    }
  });

  it('«Add»: each action sits at the end of the row under its own field', async () => {
    const el = await mount();
    await OPEN[0][2](el);
    for (const id of ['tables-floor-new-zone-submit', 'tables-floor-new-table-submit']) {
      const row = byTestId(el, id)!.closest('ion-row');
      expect(row?.classList.contains('ion-justify-content-end'), `${id} is not pushed to the end`).toBe(true);
    }
  });

  // The shell's spacing utilities are 16px each (Ionic padding/margin CSS). «Add» holds two groups —
  // a zone and a table, each a field with its action — and the gap that opens the table group must
  // be wider than the one between a field and its own action, or the two groups read as one form.
  const GAP_CLASSES = ['ion-margin-top', 'ion-padding-top'];
  const gapBefore = (row: Element): number => {
    const prev = row.previousElementSibling;
    return GAP_CLASSES.filter((c) => row.classList.contains(c)).length + (prev?.classList.contains('ion-margin-bottom') ? 1 : 0);
  };
  it('«Add»: the table group is set further apart from the zone action than a field from its action', async () => {
    const el = await mount();
    await OPEN[0][2](el);
    const zoneAction = byTestId(el, 'tables-floor-new-zone-submit')!.closest('ion-row')!;
    const tableGroup = byTestId(el, 'tables-floor-new-table-number')!.closest('ion-row')!;
    expect(zoneAction.nextElementSibling, 'the table group follows the zone action').toBe(tableGroup);
    expect(gapBefore(zoneAction), 'a field glued to its action').toBeGreaterThan(0);
    expect(gapBefore(tableGroup), 'the two groups read as one form').toBeGreaterThan(gapBefore(zoneAction));
  });

  it.each([
    ['edit table', 1, ['tables-floor-table-delete', 'tables-floor-table-save']],
    ['edit zone', 2, ['tables-floor-zone-delete', 'tables-floor-zone-save']],
  ] as const)('«%s» shows its actions as form buttons, one at each end of its foot', async (_n, i, ids) => {
    const el = await mount();
    await OPEN[i][2](el);
    const [destructive, save] = ids.map((id) => byTestId(el, id)!);
    for (const b of [destructive, save]) {
      expect(b.closest('ion-footer'), 'the action stays on screen however long the sheet').not.toBeNull();
      expect(b.closest('ion-buttons'), 'a toolbar button, not a form button').toBeNull();
    }
    const row = destructive.parentElement!;
    expect(row, 'both actions share one row').toBe(save.parentElement);
    expect(row.classList.contains('ion-justify-content-between'), 'one action at each end').toBe(true);
    expect(row.firstElementChild, 'the destructive action goes first').toBe(destructive);
  });

  it('the close button of each sheet still closes it', async () => {
    const el = await mount();
    for (const [, , open] of OPEN) {
      await open(el);
      const close = [...el.shadowRoot.querySelectorAll<HTMLElement>('[data-testid$="-close"]')]
        .find((b) => (b.closest('ion-modal') as HTMLElement & { isOpen?: boolean } | null)?.isOpen);
      expect(close, 'an open sheet with a close button').toBeTruthy();
      expect(close!.getAttribute('aria-label'), 'the icon button has an accessible name').toBe('ui.close');
      close!.click();
      await settle(el);
    }
    expect(el.addOpen || !!el.edit || !!el.zoneEdit, 'a sheet stayed open').toBe(false);
  });
});
