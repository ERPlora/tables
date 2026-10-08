// tables#131 — on a phone or a tablet, the tables placed on the right of the floor plan (laid out
// on a computer) were past the edge of the screen with no way to reach them: the plan was a box of
// the screen's width with `overflow:hidden`, and every table is painted at its saved pixel
// position. Like the floor plans of Toast (pan) or Odoo (scroll in full size), the plan now keeps
// the tables at their real size and scrolls sideways; it is as large as its farthest table, and an
// edge with tables behind it fades out, like the zone strip (tables#97).
//
// happy-dom has no layout: the geometry a 375 px phone gives the plan is stubbed on the elements
// the component measures. What the real browser paints is checked on the bench in 3 sizes.
import { beforeEach, describe, expect, it } from 'vitest';

const ZONES = [{ id: 'z1', name: 'Salón', color: 'primary', sort_order: 1, is_active: 1 }];
// The room of the issue: five tables in a row, laid out on a computer (x = 40 + 160·i). The last
// one ends at 680 + 72 = 752 px; the second row (table 6) ends at 520 + 72 = 592 px down.
const TABLES = [
  ...Array.from({ length: 5 }, (_, i) => ({
    id: `t${i + 1}`, number: String(i + 1), name: '', capacity: 4, shape: 'square', status: 'available', is_active: 1,
    zone_id: 'z1', position_x: 40 + 160 * i, position_y: 40, width: 72, height: 72,
  })),
  { id: 't6', number: '6', name: '', capacity: 4, shape: 'square', status: 'available', is_active: 1, zone_id: 'z1', position_x: 40, position_y: 520, width: 72, height: 72 },
];
const FAR_RIGHT = 680 + 72;
const FAR_DOWN = 520 + 72;
// A tile PAINTS more than its saved 72 px box: 2 px of border and .15rem/.1rem of padding on each
// side (8.8 px wide and 7.2 px tall at 16 px a rem). The plan has to hold the painted tile whole.
const PAINTED_W = 9;
const PAINTED_H = 8;

let commands: { name: string; payload: Record<string, unknown> }[] = [];

beforeEach(() => {
  commands = [];
  (globalThis as Record<string, unknown>).erplora = {
    query: async () => [],
    queryAll: async (name: string) => (name === 'tables.zones.list' ? ZONES : TABLES.map((t) => ({ ...t }))),
    queryPage: async () => ({ rows: [], total: 0 }),
    command: async (name: string, payload: Record<string, unknown>) => { commands.push({ name, payload }); return {}; },
    on: () => () => {},
    locale: 'es',
    t: (_catalog: unknown, key: string) => key,
  };
  document.body.innerHTML = '';
});

type Canvas = HTMLElement & {
  shadowRoot: ShadowRoot;
  updateComplete: Promise<unknown>;
  tables: Array<{ id: string; position_x: number; position_y: number }>;
};

async function mount(): Promise<Canvas> {
  await import('./erp-tables-canvas');
  const el = document.createElement('erp-tables-canvas') as Canvas;
  document.body.appendChild(el);
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
  return el;
}

const tick = async (el: Canvas) => {
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
};

const tile = (el: Canvas, id: string) => el.shadowRoot.querySelector<HTMLElement>(`[data-testid="tables-floor-tile-${id}"]`)!;
const viewport = (el: Canvas) => el.shadowRoot.querySelector<HTMLElement>('.canvas')!;

const rect = (left: number, top: number, width: number, height: number) =>
  ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) }) as DOMRect;

/**
 * The geometry of a 375 px phone: the plan's window is 343 × 400 px at (16, 100) and has been
 * scrolled 400 px to the right. The box the tables are positioned in (the tile's parent) moves
 * with the scroll and is as large as what it holds — unless it IS the window.
 */
function phone(el: Canvas, scrolled = 400) {
  const win = viewport(el);
  win.getBoundingClientRect = () => rect(16, 100, 343, 400);
  const plane = tile(el, 't1').parentElement!;
  if (plane !== win) {
    plane.getBoundingClientRect = () => rect(16 - scrolled, 100, parseFloat(plane.style.width), parseFloat(plane.style.height));
  }
}

function rule(el: Canvas, selector: string): string {
  const cssText = (el.constructor as unknown as { styles: { cssText: string } }).styles.cssText;
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return [...cssText.matchAll(new RegExp(`(?:^|[}\\s])${escaped}\\s*\\{([^}]*)\\}`, 'g'))].map((m) => m[1]).join(';');
}

describe('every table of the zone can be reached on a narrow screen (tables#131)', () => {
  it('the window of the plan scrolls sideways instead of cutting the plan at the screen edge', async () => {
    const el = await mount();
    const css = rule(el, '.canvas');
    expect(css, 'the plan window cuts what is past the edge').not.toMatch(/overflow\s*:\s*hidden/);
    expect(css).toMatch(/overflow-x\s*:\s*auto/);
  });

  it('a sideways swipe on the empty plan scrolls it; only a table keeps the drag gesture', async () => {
    const el = await mount();
    expect(rule(el, '.canvas'), 'touch-action on the plan window').toMatch(/touch-action\s*:\s*pan-x\s+pan-y/);
    expect(rule(el, '.mesa'), 'a table still owns its drag').toMatch(/touch-action\s*:\s*none/);
  });

  it('the plan is as wide as its farthest table, and as tall as its lowest one', async () => {
    const el = await mount();
    const plane = tile(el, 't5').parentElement!;
    expect(plane, 'tables painted straight in the window: the window is all the plan there is').not.toBe(viewport(el));
    expect(parseFloat(plane.style.width), 'width of the plan: the farthest tile, border included').toBeGreaterThanOrEqual(FAR_RIGHT + PAINTED_W);
    expect(parseFloat(plane.style.height), 'height of the plan: the lowest tile, border included').toBeGreaterThanOrEqual(FAR_DOWN + PAINTED_H);
  });

  it('the plan grows when a table is moved past it, and never shrinks below its window', async () => {
    const el = await mount();
    const plane = tile(el, 't5').parentElement!;
    expect(rule(el, '.plane'), 'an emptier zone still fills the window').toMatch(/min-width\s*:\s*100%/);
    el.tables = el.tables.map((t) => (t.id === 't5' ? { ...t, position_x: 900 } : t));
    await tick(el);
    expect(parseFloat(plane.style.width)).toBeGreaterThanOrEqual(972 + PAINTED_W);
  });
});

describe('moving a table the phone reaches by scrolling keeps it where it is (tables#131)', () => {
  it('dragging the farthest table 8 px left leaves it 8 px left — not thrown back into the first screen', async () => {
    const el = await mount();
    phone(el);
    const t5 = tile(el, 't5');
    // Table 5 is at x = 680 of the plan; scrolled 400 px, it is painted at 16 - 400 + 680 = 296 px.
    t5.dispatchEvent(new PointerEvent('pointerdown', { clientX: 330, clientY: 170, pointerId: 1, bubbles: true }));
    viewport(el).dispatchEvent(new PointerEvent('pointermove', { clientX: 322, clientY: 170, pointerId: 1, bubbles: true }));
    viewport(el).dispatchEvent(new PointerEvent('pointerup', { clientX: 322, clientY: 170, pointerId: 1, bubbles: true }));
    await tick(el);
    const move = commands.find((c) => c.name === 'tables.tables.move');
    expect(move, 'the drag is saved').toBeTruthy();
    expect(move!.payload.position_x).toBe(672);
    expect(move!.payload.position_y).toBe(40);
  });

  it('it still does not leave the plan: dragged right, the farthest table stops with its painted edge inside', async () => {
    const el = await mount();
    phone(el);
    const t5 = tile(el, 't5');
    t5.dispatchEvent(new PointerEvent('pointerdown', { clientX: 330, clientY: 170, pointerId: 1, bubbles: true }));
    viewport(el).dispatchEvent(new PointerEvent('pointermove', { clientX: 360, clientY: 170, pointerId: 1, bubbles: true }));
    viewport(el).dispatchEvent(new PointerEvent('pointerup', { clientX: 360, clientY: 170, pointerId: 1, bubbles: true }));
    await tick(el);
    const x = Number(commands.find((c) => c.name === 'tables.tables.move')!.payload.position_x);
    const plane = parseFloat(tile(el, 't5').parentElement!.style.width);
    expect(x, 'the table did not move right at all').toBeGreaterThanOrEqual(680);
    expect(x + 72 + PAINTED_W, 'the painted tile goes past the edge of the plan').toBeLessThanOrEqual(plane);
  });

  it('the arrow keys move the farthest table one step, not back into the first screen', async () => {
    const el = await mount();
    phone(el);
    tile(el, 't5').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    await tick(el);
    const move = commands.find((c) => c.name === 'tables.tables.move');
    expect(move!.payload.position_x).toBe(672);
    tile(el, 't6').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    await tick(el);
    expect(commands.filter((c) => c.name === 'tables.tables.move')[1].payload.position_y, 'the lowest table moves up one step').toBe(512);
  });
});

function layOut(win: HTMLElement, { scrollWidth = FAR_RIGHT, clientWidth = 343, scrollLeft = 0 } = {}) {
  Object.defineProperty(win, 'scrollWidth', { configurable: true, get: () => scrollWidth });
  Object.defineProperty(win, 'clientWidth', { configurable: true, get: () => clientWidth });
  Object.defineProperty(win, 'scrollLeft', { configurable: true, get: () => scrollLeft, set: () => {} });
}

async function scrollTo(el: Canvas, geometry: Parameters<typeof layOut>[1]) {
  const win = viewport(el);
  layOut(win, geometry);
  win.dispatchEvent(new Event('scroll'));
  await el.updateComplete;
}

const cues = (win: HTMLElement) => ({ left: win.classList.contains('more-left'), right: win.classList.contains('more-right') });

describe('the plan says there are more tables past the edge (tables#131)', () => {
  it('at rest on a phone the right edge fades: tables to the right, none to the left', async () => {
    const el = await mount();
    await scrollTo(el, { scrollLeft: 0 });
    expect(cues(viewport(el))).toEqual({ left: false, right: true });
  });

  it('scrolled to the end, only the left edge fades', async () => {
    const el = await mount();
    await scrollTo(el, { scrollLeft: FAR_RIGHT - 343 });
    expect(cues(viewport(el))).toEqual({ left: true, right: false });
  });

  it('when the whole plan fits (a computer), no edge fades', async () => {
    const el = await mount();
    await scrollTo(el, { scrollWidth: 1100, clientWidth: 1100, scrollLeft: 0 });
    expect(cues(viewport(el))).toEqual({ left: false, right: false });
  });

  it('the fade is in the styles of the plan window', async () => {
    const el = await mount();
    expect(rule(el, '.canvas.more-right')).toMatch(/mask-image\s*:\s*linear-gradient\(to right/);
    expect(rule(el, '.canvas.more-left')).toMatch(/mask-image\s*:\s*linear-gradient\(to left/);
  });

  it('the phone opens the plan with the cue already on: the window is watched as it is laid out', async () => {
    const watchers: Array<{ cb: () => void; targets: Element[] }> = [];
    const g = globalThis as Record<string, unknown>;
    const original = g.ResizeObserver;
    g.ResizeObserver = class {
      private rec: { cb: () => void; targets: Element[] };
      constructor(cb: () => void) { this.rec = { cb, targets: [] }; watchers.push(this.rec); }
      observe(target: Element) { this.rec.targets.push(target); }
      unobserve() {}
      disconnect() {}
    };
    try {
      const el = await mount();
      const win = viewport(el);
      const watching = watchers.filter((w) => w.targets.includes(win));
      expect(watching.length, 'nobody watches the plan window').toBeGreaterThan(0);
      layOut(win, { scrollLeft: 0 });
      watching.forEach((w) => w.cb());
      expect(cues(win)).toEqual({ left: false, right: true });
    } finally {
      g.ResizeObserver = original;
    }
  });
});
