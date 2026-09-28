// tables#97 — on a phone the floor plan hid two things with no way to tell:
//  1. the zone strip (a scrollable ion-segment) was cut at the right edge — «Sala Terraza Patio P»
//     — with no fade, arrow or peek, so the zones past the edge looked like they did not exist;
//  2. the help line under the plan fell below the fold, and the plan (`touch-action:none`, so a
//     table can be dragged) took the whole screen: there was nowhere to swipe the page up to read it.
// The strip now fades on every edge that has more zones behind it (like any scrollable tab strip),
// and the EMPTY plan lets a vertical swipe scroll the page — only a table keeps the drag gesture.
import { beforeEach, describe, expect, it } from 'vitest';

const ZONES = ['Sala', 'Terraza', 'Patio', 'Porch', 'Jardín', 'Barra'].map((name, i) => ({
  id: `z${i + 1}`, name, color: 'primary', sort_order: i, is_active: 1,
}));
const TABLES = [
  { id: 't1', number: '1', name: '', capacity: 4, shape: 'square', status: 'available', is_active: 1, zone_id: 'z1', position_x: 10, position_y: 10, width: 72, height: 72 },
];

/** ResizeObservers the component starts, so a test can fire them the way the browser does. */
let observers: Array<{ cb: () => void; targets: Element[]; disconnected: boolean }> = [];

beforeEach(() => {
  observers = [];
  (globalThis as Record<string, unknown>).ResizeObserver = class {
    private rec: { cb: () => void; targets: Element[]; disconnected: boolean };
    constructor(cb: () => void) { this.rec = { cb, targets: [], disconnected: false }; observers.push(this.rec); }
    observe(el: Element) { this.rec.targets.push(el); }
    unobserve() {}
    disconnect() { this.rec.disconnected = true; }
  };
  (globalThis as Record<string, unknown>).erplora = {
    query: async () => [],
    queryAll: async (name: string) => (name === 'tables.zones.list' ? ZONES : TABLES),
    queryPage: async () => ({ rows: [], total: 0 }),
    command: async () => ({}),
    on: () => () => {},
    locale: 'es',
    t: (_catalog: unknown, key: string) => key,
  };
  document.body.innerHTML = '';
});

type Canvas = HTMLElement & { shadowRoot: ShadowRoot; updateComplete: Promise<unknown>; requestUpdate(): void };

async function mount(): Promise<Canvas> {
  await import('./erp-tables-canvas');
  const el = document.createElement('erp-tables-canvas') as Canvas;
  document.body.appendChild(el);
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
  return el;
}

function strip(el: Canvas): HTMLElement {
  const seg = el.shadowRoot.querySelector<HTMLElement>('[data-testid="tables-floor-zones"]');
  if (!seg) throw new Error('zone strip not rendered');
  return seg;
}

/** Give the strip the geometry a 390 px phone gives it: 428 px of zones in a 270 px window. */
function layOut(seg: HTMLElement, { scrollWidth = 428, clientWidth = 270, scrollLeft = 0 } = {}) {
  Object.defineProperty(seg, 'scrollWidth', { configurable: true, get: () => scrollWidth });
  Object.defineProperty(seg, 'clientWidth', { configurable: true, get: () => clientWidth });
  Object.defineProperty(seg, 'scrollLeft', { configurable: true, get: () => scrollLeft, set: () => {} });
}

async function scrollTo(el: Canvas, seg: HTMLElement, geometry: Parameters<typeof layOut>[1]) {
  layOut(seg, geometry);
  seg.dispatchEvent(new Event('scroll'));
  await el.updateComplete;
}

const cues = (seg: HTMLElement) => ({ left: seg.classList.contains('more-left'), right: seg.classList.contains('more-right') });

describe('the zone strip says when there are more zones past the edge (tables#97)', () => {
  it('at rest on a phone, the right edge fades: more zones to the right, none to the left', async () => {
    const el = await mount();
    const seg = strip(el);
    await scrollTo(el, seg, { scrollLeft: 0 });
    expect(cues(seg)).toEqual({ left: false, right: true });
  });

  it('scrolled to the end, only the left edge fades', async () => {
    const el = await mount();
    const seg = strip(el);
    await scrollTo(el, seg, { scrollLeft: 428 - 270 });
    expect(cues(seg)).toEqual({ left: true, right: false });
  });

  it('scrolled half way, both edges fade', async () => {
    const el = await mount();
    const seg = strip(el);
    await scrollTo(el, seg, { scrollLeft: 80 });
    expect(cues(seg)).toEqual({ left: true, right: true });
  });

  it('when every zone fits, no edge fades (a desktop or a room with two zones)', async () => {
    const el = await mount();
    const seg = strip(el);
    await scrollTo(el, seg, { scrollWidth: 270, clientWidth: 270, scrollLeft: 0 });
    expect(cues(seg)).toEqual({ left: false, right: false });
  });

  it('the cue follows the strip back: fading on the left at the end, gone once it returns to the start', async () => {
    const el = await mount();
    const seg = strip(el);
    await scrollTo(el, seg, { scrollLeft: 158 });
    await scrollTo(el, seg, { scrollLeft: 0 });
    expect(cues(seg)).toEqual({ left: false, right: true });
  });

  it('right-to-left: the strip starts at the right edge (scrollLeft 0) and the hidden zones are on the LEFT', async () => {
    const el = await mount();
    const seg = strip(el);
    seg.style.direction = 'rtl';
    await scrollTo(el, seg, { scrollLeft: 0 });
    expect(cues(seg)).toEqual({ left: true, right: false });
  });

  it('the phone opens the plan with the cue already on, without anyone scrolling the strip', async () => {
    // Ionic lays the segment buttons out after the first paint, so the overflow appears LATER:
    // the browser reports it through a ResizeObserver on the strip and its buttons.
    const el = await mount();
    const seg = strip(el);
    layOut(seg, { scrollLeft: 0 });
    const watching = observers.filter((o) => !o.disconnected && o.targets.includes(seg));
    expect(watching.length, 'nobody watches the strip grow').toBeGreaterThan(0);
    const buttons = [...seg.querySelectorAll('ion-segment-button')];
    expect(buttons.length).toBe(ZONES.length);
    for (const b of buttons) {
      expect(watching.some((o) => o.targets.includes(b)), 'a zone button is not watched: its label can widen the strip unseen').toBe(true);
    }
    watching.forEach((o) => o.cb());
    await el.updateComplete;
    expect(cues(seg)).toEqual({ left: false, right: true });
  });

  it('the cue is a fade the person sees: each class masks its own edge, both classes mask both', async () => {
    const el = await mount();
    const seg = strip(el);
    const mask = (s: HTMLElement) => {
      const cs = getComputedStyle(s);
      return cs.getPropertyValue('mask-image') || cs.getPropertyValue('-webkit-mask-image');
    };
    expect(mask(seg), 'a strip that fits must not fade').toMatch(/^(none)?$/);
    await scrollTo(el, seg, { scrollLeft: 0 });
    expect(mask(seg)).toMatch(/linear-gradient\(to right, #000 calc\(100% - 2\.5rem\), transparent\)/);
    await scrollTo(el, seg, { scrollLeft: 158 });
    expect(mask(seg)).toMatch(/linear-gradient\(to left, #000 calc\(100% - 2\.5rem\), transparent\)/);
    await scrollTo(el, seg, { scrollLeft: 80 });
    expect(mask(seg)).toMatch(/linear-gradient\(to right, transparent, #000 2\.5rem, #000 calc\(100% - 2\.5rem\), transparent\)/);
  });

  it('leaving the plan stops watching the strip', async () => {
    const el = await mount();
    const seg = strip(el);
    el.remove();
    const still = observers.filter((o) => !o.disconnected && o.targets.includes(seg));
    expect(still.length).toBe(0);
  });
});

describe('the empty plan lets the page scroll, so the help line under it can be read (tables#97)', () => {
  it('a vertical swipe on the plan scrolls the page; a table keeps the drag (no browser gesture)', async () => {
    const el = await mount();
    const canvas = el.shadowRoot.querySelector<HTMLElement>('.canvas');
    const tile = el.shadowRoot.querySelector<HTMLElement>('[data-testid="tables-floor-tile-t1"]');
    expect(canvas && tile).toBeTruthy();
    expect(getComputedStyle(canvas as HTMLElement).touchAction).toBe('pan-y');
    expect(getComputedStyle(tile as HTMLElement).touchAction).toBe('none');
  });

  it('the help line is still rendered under the plan', async () => {
    const el = await mount();
    const hint = el.shadowRoot.querySelector('.canvas + .hint');
    expect(hint?.textContent).toBe('ui.canvasHint');
  });
});
