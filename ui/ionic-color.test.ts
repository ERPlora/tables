// No `ion-*` of this module takes its colour from `color=` (ERPlora/pm#392, module-toolkit#273).
//
// Ionic implements `color="danger"` with a GLOBAL rule of the document stylesheet
// (`.ion-color-danger { --ion-color-base: … }`), which does not reach inside a shadow root. Where the
// button lives decides the fix:
//   · in the component's own shadow root (the POS zone picker's native <dialog>): «Remove table»
//     fell back to the primary blue. It carries a `tone-danger` class and the component's
//     `static styles` paint it from the token;
//   · inside an `ion-modal` (close a session, delete a zone, and since tables#107 the floor plan's
//     «Delete table» / «Delete zone»): Ionic reparents an open modal to `ion-app`, where the
//     component's `static styles` never arrive. There the tone travels INLINE, as custom
//     properties read from the token (`ionTone`).
//
// happy-dom neither lays out nor loads Ionic's CSS, so the computed colours were measured in a real
// browser; what is pinned here is the CONTRACT that makes them paint.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { ionTone } from './lib/ion-tone';

// The `ui/` of THIS checkout, from the test's own URL: a fixed folder name (`modules/tables`, a
// worktree) would scan a sibling checkout and let a `color=` added HERE through.
const UI = path.dirname(fileURLToPath(import.meta.url));

function sources(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sources(full));
    else if (/\.ts$/.test(entry.name) && !/\.(test|spec)\.ts$/.test(entry.name)) out.push(full);
  }
  return out;
}

/**
 * The attribute names of every `<ion-*>` opening tag. A Lit tag does not end at the first `>`
 * (`@click=${() => …}`), so `${…}` expressions and quoted values are skipped, not read.
 */
function ionTags(source: string): { line: number; attrs: string }[] {
  const found: { line: number; attrs: string }[] = [];
  const start = /<ion-[a-z-]+(?=[\s/>])/g;
  let m: RegExpExecArray | null;
  while ((m = start.exec(source))) {
    let attrs = '';
    let depth = 0;
    let quote: string | null = null;
    for (let i = m.index + m[0].length; i < source.length; i += 1) {
      const ch = source[i];
      if (quote) {
        if (ch === '\\') i += 1;
        else if (ch === quote) quote = null;
        continue;
      }
      if (depth > 0) {
        if (ch === '"' || ch === "'" || ch === '`') quote = ch;
        else if (ch === '{') depth += 1;
        else if (ch === '}') depth -= 1;
        continue;
      }
      if (ch === '$' && source[i + 1] === '{') { depth = 1; i += 1; continue; }
      if (ch === '"' || ch === "'") { quote = ch; continue; }
      if (ch === '>') break;
      attrs += ch;
    }
    found.push({ line: source.slice(0, m.index).split('\n').length, attrs: `${m[0]}${attrs}` });
  }
  return found;
}

const DECLARES_COLOR = /(?:^|\s)\.?color=/;

describe('pm#392: no ion-* delegates its colour to color=', () => {
  it('the source of ui/ carries no color= on an ion-* element', () => {
    const offenders = sources(UI).flatMap((file) =>
      ionTags(readFileSync(file, 'utf8'))
        .filter((t) => DECLARES_COLOR.test(t.attrs))
        .map((t) => `${path.relative(UI, file)}:${t.line}`),
    );
    expect(offenders, 'color= paints nothing inside a module shadow root').toEqual([]);
  });

  it('the reader sees a color= after a multi-line tag or an arrow function (control of the control)', () => {
    expect(ionTags('<ion-button class="x" expand="block" color="danger"\n  ?disabled=${a > b}>x</ion-button>').filter((t) => DECLARES_COLOR.test(t.attrs))).toHaveLength(1);
    expect(ionTags('<ion-button @click=${() => ({ color: 1 })}>x</ion-button>').filter((t) => DECLARES_COLOR.test(t.attrs))).toHaveLength(0);
  });
});

describe('ionTone: the inline custom properties, read from the theme token', () => {
  it('a solid button paints its background, its states and its text from the tone', () => {
    const s = ionTone('solid', 'danger');
    expect(s).toContain('--background: var(--ion-color-danger, #c5000f)');
    expect(s).toContain('--background-activated: var(--ion-color-danger-shade, #ad000d)');
    expect(s).toContain('--background-focused: var(--ion-color-danger-shade, #ad000d)');
    expect(s).toContain('--background-hover: var(--ion-color-danger-tint, #cb1a27)');
    expect(s).toContain('--color: var(--ion-color-danger-contrast, #fff)');
  });

  it('an outline button paints its text, its border and its states from the tone — never a fill', () => {
    const s = ionTone('outline', 'danger');
    expect(s).toContain('--color: var(--ion-color-danger, #c5000f)');
    expect(s).toContain('--border-color: var(--ion-color-danger, #c5000f)');
    expect(s).toContain('--background-activated: var(--ion-color-danger, #c5000f)');
    expect(s).toContain('--background-focused: var(--ion-color-danger, #c5000f)');
    expect(s, 'an outline button keeps its transparent background').not.toMatch(/(^|;\s*)--background:/);
  });
});

// ── The components ───────────────────────────────────────────────────────────────────────────────

type Styled = { styles: { cssText: string } | { cssText: string }[] };
const cssOf = (ctor: unknown): string => {
  const s = (ctor as Styled).styles;
  return Array.isArray(s) ? s.map((c) => c.cssText).join('\n') : s.cssText;
};

/** The body of the first rule whose selector matches `selector`. */
function ruleBody(css: string, selector: RegExp): string {
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) if (selector.test(m[1])) return m[2];
  return '';
}

const OUTLINED_DANGER = /ion-button\.tone-danger\[fill\]/;

const SESSION = {
  id: 's1', table_id: 't1', table_number: '6', zone: 'Terraza', waiter_id: null, status: 'active',
  guests_count: 2, opened_at: '2026-09-23T12:00:00Z', closed_at: null, order_id: null, notes: '',
};
const ZONE = { id: 'z1', name: 'Terraza', description: '', table_count: 0 };
const TABLE = { id: 't1', number: '6', zone_id: 'z1', shape: 'square', status: 'available', capacity: 4, x: 0, y: 0 };

beforeEach(() => {
  document.body.innerHTML = '';
  (globalThis as Record<string, unknown>).erplora = {
    query: async () => [],
    queryPage: async () => ({ rows: [], total: 0, limit: 50, offset: 0 }),
    queryAll: async () => [],
    command: async () => ({}),
    on: () => () => {},
    hasPermission: () => true,
    locale: 'es',
    t: (_catalog: unknown, key: string) => key,
    currency: 'EUR',
    formatMoney: (cents: number) => `${((cents || 0) / 100).toFixed(2)} €`,
    loadSlot: async () => [],
  };
});

type Wc = HTMLElement & { shadowRoot: ShadowRoot; updateComplete: Promise<unknown> } & Record<string, unknown>;

async function mount(tag: string, load: () => Promise<unknown>): Promise<Wc> {
  await load();
  const el = document.createElement(tag) as Wc;
  document.body.appendChild(el);
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
  return el;
}

const byTestId = (el: Wc, id: string) => el.shadowRoot.querySelector(`[data-testid="${id}"]`);

describe('pm#392: in the component shadow root the tone is a class painted by static styles', () => {
  it('the POS zone picker paints its outline/clear danger button from the token', async () => {
    const tag = 'erp-tables-pos-zones';
    await import('./components/erp-tables-pos-zones/erp-tables-pos-zones');
    const rule = ruleBody(cssOf(customElements.get(tag)), OUTLINED_DANGER);
    expect(rule, 'text').toMatch(/--color:\s*var\(--ion-color-danger\b/);
    expect(rule, 'border').toMatch(/--border-color:\s*var\(--ion-color-danger\b/);
  });

  it('POS picker: «Remove table» carries the tone', async () => {
    const el = await mount('erp-tables-pos-zones', () => import('./components/erp-tables-pos-zones/erp-tables-pos-zones'));
    el.selectedId = 't1';
    el.selectedLabel = '6';
    await el.updateComplete;
    const remove = byTestId(el, 'tables-pos-remove');
    expect(remove, 'rendered with a table selected').not.toBeNull();
    expect(remove!.classList.contains('tone-danger')).toBe(true);
    expect(remove!.hasAttribute('color')).toBe(false);
  });
});

describe('pm#392: inside a reparented ion-modal the tone travels inline', () => {
  it('floor plan: «Delete table» and «Delete zone» of the edit sheets are outline danger (tables#107)', async () => {
    const el = await mount('erp-tables-canvas', () => import('./components/erp-tables-canvas/erp-tables-canvas'));
    el.edit = TABLE;
    await el.updateComplete;
    const table = byTestId(el, 'tables-floor-table-delete');
    expect(table, 'rendered with a table in edit').not.toBeNull();
    expect(table!.getAttribute('style')).toBe(ionTone('outline', 'danger'));
    expect(table!.hasAttribute('color')).toBe(false);
    el.edit = undefined;
    el.zoneEdit = ZONE;
    await el.updateComplete;
    const zone = byTestId(el, 'tables-floor-zone-delete');
    expect(zone, 'rendered with a zone in edit').not.toBeNull();
    expect(zone!.getAttribute('style')).toBe(ionTone('outline', 'danger'));
    expect(zone!.hasAttribute('color')).toBe(false);
  });

  it('sessions: «Close session» of the detail and its confirmation are solid danger', async () => {
    const el = await mount('erp-tables-sessions', () => import('./components/erp-tables-sessions/erp-tables-sessions'));
    el.detail = SESSION;
    el.closeTarget = SESSION;
    await el.updateComplete;
    for (const id of ['tables-sessions-detail-close-session', 'tables-sessions-close-confirm']) {
      const btn = byTestId(el, id);
      expect(btn, id).not.toBeNull();
      expect(btn!.getAttribute('style') ?? '', id).toContain(ionTone('solid', 'danger'));
      expect(btn!.hasAttribute('color'), id).toBe(false);
    }
  });

  it('zones: the delete confirmation is solid danger', async () => {
    const el = await mount('erp-tables-zones', () => import('./components/erp-tables-zones/erp-tables-zones'));
    el.deleteTarget = ZONE;
    await el.updateComplete;
    const btn = byTestId(el, 'tables-zones-delete-confirm');
    expect(btn).not.toBeNull();
    expect(btn!.getAttribute('style') ?? '').toContain(ionTone('solid', 'danger'));
    expect(btn!.hasAttribute('color')).toBe(false);
  });
});
