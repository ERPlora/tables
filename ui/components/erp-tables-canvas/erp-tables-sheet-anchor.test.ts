// Where the floor plan's SHEETS are laid out -- and why it is neither the viewport nor the host
// (tables#88).
//
// The symptom, on a tablet or an Android phone: the floor manager opens «Edit table» (or «Edit
// zone», or «Add»), taps SAVE or DELETE at the foot of the sheet, and nothing is saved -- the app
// switches tab instead. The tap lands on the shell's module tab bar, painted on top of the sheet.
//
// `.scrim` was `position:fixed; inset:0`, so the sheet was centred over the WHOLE VIEWPORT with a
// `max-height:90vh` cap. A module does not own the viewport: the shell mounts it inside an
// `ion-content` (AppPage, `fullscreen=false`) that ends where the tab bar starts, and no z-index in
// this shadow tree can win over that tab bar.
//
// The fix of the till (sales#315) anchors the scrim to the module's own box. MEASURED in Chromium
// on a shell-shaped mount (ion-header + ion-content.ion-padding > .outlet{height:100%;
// min-height:480px} + ion-footer segment with the safe-area inset), sampling the foot buttons with
// `elementFromPoint` through the shadow roots, that is NOT enough here:
//
//                                    fixed+90vh (before)   anchored to the host   visible box (this)
//   tablet 1280x460 (keyboard up)    table 68/238          table 0/238            238/238
//                                    zone 287/287          zone 0/287             287/287
//   phone 900x426 landscape          table 0/238           table 0/238            238/238
//
// Anchoring to the host drops the foot under the tab bar on short screens, because the shell
// floors its `.outlet` at 480px (hub#1730) so the module box is TALLER than what is visible there.
// A native <dialog> (top layer) is not an option either: these sheets hold `ion-select`s, whose
// popovers live in `ion-app` and would be made inert by `showModal()`. What the person actually
// sees is the `ion-content` box, so the scrim is laid over exactly that box, clipped to the
// viewport, and re-measured when it resizes (the on-screen keyboard).
import { beforeEach, describe, expect, it } from 'vitest';

type Canvas = HTMLElement & {
  updateComplete: Promise<unknown>; addOpen: boolean;
  edit?: Record<string, unknown>; zoneEdit?: Record<string, unknown>;
};

const ZONES = [{ id: 'z1', name: 'Hall', color: '#00f', sort_order: 1, is_active: 1 }];

beforeEach(() => {
  (globalThis as Record<string, unknown>).erplora = {
    query: async () => [], queryAll: async (n: string) => (n === 'tables.zones.list' ? ZONES : []),
    queryPage: async () => ({ rows: [], total: 0 }), command: async () => ({}),
    on: () => () => {}, locale: 'en', t: (_c: unknown, k: string) => k,
  };
  document.body.replaceChildren();
});

/** The CSS the component declares (Lit's `static styles`). */
async function canvasCss(): Promise<string> {
  await import('./erp-tables-canvas');
  const ctor = customElements.get('erp-tables-canvas') as unknown as {
    styles: { cssText: string } | Array<{ cssText: string }>;
  };
  return [ctor.styles].flat().map((s) => s.cssText).join('\n');
}

function rules(css: string, selector: string): string {
  const escaped = selector.replace(/[.[\]()]/g, '\\$&');
  return (css.match(new RegExp(`(?:^|[\\s}])${escaped}\\s*\\{[^}]*\\}`, 'g')) ?? []).join('\n');
}

/** A rectangle, as `getBoundingClientRect` returns it. */
function box(top: number, left: number, width: number, height: number): DOMRect {
  return { top, left, width, height, bottom: top + height, right: left + width, x: left, y: top, toJSON: () => ({}) } as DOMRect;
}

/** Mounts the canvas the way the shell does: inside an `ion-content` whose box is `area`. */
async function mountInShell(area: DOMRect): Promise<{ el: Canvas; content: HTMLElement }> {
  await import('./erp-tables-canvas');
  const content = document.createElement('ion-content');
  content.getBoundingClientRect = () => area;
  const outlet = document.createElement('div');
  const el = document.createElement('erp-tables-canvas') as Canvas;
  outlet.appendChild(el);
  content.appendChild(outlet);
  document.body.appendChild(content);
  await el.updateComplete;
  return { el, content };
}

async function scrimOf(el: Canvas): Promise<HTMLElement> {
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  const scrim = el.shadowRoot!.querySelector<HTMLElement>('.scrim');
  expect(scrim, 'a sheet is open').toBeTruthy();
  return scrim!;
}

describe('the floor plan sheets are laid over the VISIBLE module box (tables#88)', () => {
  it.each([
    ['add', (el: Canvas) => { el.addOpen = true; }],
    ['edit table', (el: Canvas) => { el.edit = { id: 'm1', number: '1', capacity: 4, shape: 'square', zone_id: 'z1' }; }],
    ['edit zone', (el: Canvas) => { el.zoneEdit = { id: 'z1', name: 'Hall', color: '#00f' }; }],
  ])('the «%s» scrim covers the ion-content box, so its foot ends above the tab bar', async (_n, open) => {
    // Tablet with the keyboard up: topbar 56px, ion-content 56..388, tab bar from 388 down.
    window.innerWidth = 1280; window.innerHeight = 460;
    const { el } = await mountInShell(box(56, 0, 1280, 332));
    open(el);
    const scrim = await scrimOf(el);

    expect(scrim.style.top, 'starts under the topbar').toBe('56px');
    expect(scrim.style.height, 'and stops where the tab bar starts, not at the bottom of the screen').toBe('332px');
    expect(scrim.style.left).toBe('0px');
    expect(scrim.style.width).toBe('1280px');
  });

  it('never reaches past the viewport when the content box is taller than the screen', async () => {
    window.innerWidth = 426; window.innerHeight = 560;
    const { el } = await mountInShell(box(56, 0, 426, 900));
    el.addOpen = true;
    const scrim = await scrimOf(el);

    expect(scrim.style.top).toBe('56px');
    expect(scrim.style.height, 'clipped to what the screen shows').toBe('504px');
  });

  it('is re-measured when the box changes while the sheet is open (the keyboard comes up)', async () => {
    window.innerWidth = 1280; window.innerHeight = 776;
    const { el, content } = await mountInShell(box(56, 0, 1280, 648));
    el.addOpen = true;
    const scrim = await scrimOf(el);
    expect(scrim.style.height).toBe('648px');

    window.innerHeight = 460;
    content.getBoundingClientRect = () => box(56, 0, 1280, 332);
    window.dispatchEvent(new Event('resize'));
    await el.updateComplete;

    expect(scrim.style.height, 'follows the smaller box').toBe('332px');
  });

  it('outside a shell (no ion-content) the scrim still covers the viewport', async () => {
    window.innerWidth = 800; window.innerHeight = 600;
    await import('./erp-tables-canvas');
    const el = document.createElement('erp-tables-canvas') as Canvas;
    document.body.appendChild(el);
    el.addOpen = true;
    const scrim = await scrimOf(el);

    expect(scrim.style.top).toBe('0px');
    expect(scrim.style.height).toBe('600px');
  });

  it('.sheet is capped by the scrim box, never by the viewport height', async () => {
    const sheet = rules(await canvasCss(), '.sheet');
    const maxHeight = sheet.match(/max-height\s*:\s*([^;}]+)/);

    expect(maxHeight, '.sheet caps its height so a long sheet still scrolls inside').toBeTruthy();
    expect(
      maxHeight![1],
      'vh is the viewport, and the viewport is not the module: 90vh centred leaves 5vh of clearance '
      + 'and the tab bar is taller than that',
    ).not.toMatch(/vh/);
  });

  it('.sheet fits INSIDE the scrim padding: its own padding counts against the cap', async () => {
    // MEASURED: `.sheet` is content-box, so `max-height:100%` plus its 1rem padding came out 2rem
    // taller than the scrim's content box and swallowed the breathing room on a short screen
    // (sheet 56..388 over a scrim 56..388 instead of 72..372).
    const sheet = rules(await canvasCss(), '.sheet');
    const borderBox = /box-sizing\s*:\s*border-box/.test(sheet);
    const maxHeight = sheet.match(/max-height\s*:\s*([^;}]+)/)![1].trim();
    expect(
      borderBox || /^calc\(\s*100%\s*-/.test(maxHeight),
      `max-height:${maxHeight} must leave room for the sheet's own padding`,
    ).toBe(true);
  });
});
