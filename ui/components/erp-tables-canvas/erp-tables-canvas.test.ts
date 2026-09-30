// #271 — «Las mesas del Salón aparecen apiladas»: las mesas se posicionan con `position:absolute;
// left/top` leyendo `position_x`/`position_y`, que defaultean a 0 cuando faltan. Las mesas creadas
// por seed/blueprint SIN coordenadas colapsaban todas en (0,0) y se superponían. Solo `addTable()`
// calculaba un offset en cascada (para las creadas a mano desde la UI). Aquí se fija el auto-layout
// de fallback: tras cargar, las mesas sin coords reales se reparten en un grid para que ninguna
// quede encima de otra.
import { beforeEach, describe, expect, it } from 'vitest';

const ZONAS = [
  { id: 'z1', name: 'Salón', color: '#00f', sort_order: 1, is_active: 1 },
];

// Mesas como llegan de un blueprint/seed: SIN posición (0,0). En el plano real colapsan en esquina.
function mesasSinCoords(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `m${i + 1}`, number: String(i + 1), name: '', capacity: 4, shape: 'square',
    status: 'available', is_active: 1, zone_id: 'z1', position_x: 0, position_y: 0, width: 0, height: 0,
  }));
}

beforeEach(() => {
  (globalThis as Record<string, unknown>).erplora = {
    query: async () => [],
    queryAll: async (name: string) => (name === 'tables.zones.list' ? ZONAS : []),
    queryPage: async () => ({ rows: [], total: 0 }),
    command: async () => ({}),
    on: () => () => {},
    locale: 'es',
    t: (_catalog: unknown, key: string) => key,
  };
});

/** tables#107 — the window of the sheet that is on screen: each sheet lives in its own ion-modal. */
function openWindow(el: { shadowRoot: ShadowRoot }): HTMLElement | null {
  return [...el.shadowRoot.querySelectorAll<HTMLElement & { isOpen?: boolean }>('ion-modal')].find((m) => m.isOpen) ?? null;
}

async function montar() {
  await import('./erp-tables-canvas');
  const el = document.createElement('erp-tables-canvas');
  document.body.appendChild(el);
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  return el as unknown as {
    shadowRoot: ShadowRoot;
    tables: Array<{ id: string; position_x: number; position_y: number }>;
    updateComplete: Promise<unknown>;
  };
}

describe('mesas sin coordenadas (blueprint/seed) → auto-layout, no apiladas (#271)', () => {
  it('5 mesas que llegan en (0,0) NO quedan todas en (0,0)', async () => {
    const sdk = (globalThis as Record<string, unknown>).erplora as Record<string, unknown>;
    sdk.queryAll = async (name: string) => (name === 'tables.zones.list' ? ZONAS : mesasSinCoords(5));
    const el = await montar();
    const enCero = el.tables.filter((t) => t.position_x === 0 && t.position_y === 0);
    expect(enCero.length, 'varias mesas en (0,0) se superponen en la esquina').toBeLessThan(el.tables.length);
  });

  it('ninguna pareja de mesas comparte la misma posición (no se solapan)', async () => {
    const sdk = (globalThis as Record<string, unknown>).erplora as Record<string, unknown>;
    sdk.queryAll = async (name: string) => (name === 'tables.zones.list' ? ZONAS : mesasSinCoords(6));
    const el = await montar();
    const pos = el.tables.map((t) => `${t.position_x},${t.position_y}`);
    expect(new Set(pos).size, 'hay posiciones repetidas → mesas apiladas').toBe(pos.length);
  });

  // tables#57 — the fixture used to be `width: 0, height: 0`, a shape a real row cannot have: the
  // payload of `tables.tables.move` REQUIRES `width`/`height` ≥ 1 (`schemas/table_move.json`) and
  // the canvas has sent `BOX` since the module's first version, so a table with a saved position
  // always has a saved box. That is exactly what now tells a placed table from a seeded one, so
  // the fixture is the box a placed table really carries.
  it('las mesas con coords reales se respetan (no se reordenan)', async () => {
    const sdk = (globalThis as Record<string, unknown>).erplora as Record<string, unknown>;
    sdk.queryAll = async (name: string) => (name === 'tables.zones.list'
      ? ZONAS
      : [
          { id: 'a', number: '1', name: '', capacity: 4, shape: 'square', status: 'available', is_active: 1, zone_id: 'z1', position_x: 100, position_y: 50, width: 72, height: 72 },
          { id: 'b', number: '2', name: '', capacity: 4, shape: 'square', status: 'available', is_active: 1, zone_id: 'z1', position_x: 300, position_y: 50, width: 72, height: 72 },
        ]);
    const el = await montar();
    const a = el.tables.find((t) => t.id === 'a');
    expect(a?.position_x, 'una mesa con coords reales no debe moverse').toBe(100);
    expect(a?.position_y).toBe(50);
  });
});

// tables#53 — el plano APILABA las mesas, y la pila era aritmética, no mala suerte.
//
// `bulk_create` generaba `x = (i % 5) * 20`, `y = (i / 5) * 20` con `width`/`height` = 10 — una
// rejilla coherente CON SIGO MISMA— y el lienzo dibujaba cajas FIJAS de 72 px en esas coordenadas
// crudas, ignorando el `width`/`height` que la propia fila trae. Paso 20, caja 72: 56 px de
// solape, el 74 % del ancho. De las 12 mesas del Salón de la plantilla Restaurante se leían dos
// números.
//
// El arreglo del generador (handler) no basta: TODOS los hubs de restaurante ya tienen esas
// coordenadas guardadas. Y el auto-layout de #271 no las alcanza, porque solo reparte las que
// están en (0,0) — (20,0) y (40,0) le parecen «coordenadas reales» y las pinta verbatim. Ésa es
// la otra puerta, y es la que usa el propio módulo.
//
// Contrato que se fija aquí:
//   1. una mesa se pinta con SU tamaño (el que persiste `tables.tables.move`), no con uno fijo;
//   2. un `width`/`height` por debajo de una caja real es el residuo de la unidad vieja, no un
//      tamaño que alguien eligiera: se pinta con el de por defecto;
//   3. dos mesas que se TAPARÍAN con su caja real se reparten en la rejilla, aunque sus
//      coordenadas no sean (0,0). Es la red que hace legible lo que ya está guardado.
describe('el plano no apila las mesas (tables#53)', () => {
  /** El rectángulo que se PINTA, leído del estilo inline (happy-dom no hace layout). */
  function rects(el: { shadowRoot: ShadowRoot }) {
    return [...el.shadowRoot.querySelectorAll<HTMLElement>('.mesa')].map((m) => {
      const px = (prop: string) => Number(/(-?\d+(?:\.\d+)?)px/.exec(m.style.getPropertyValue(prop))?.[1] ?? NaN);
      return { x: px('left'), y: px('top'), w: px('width'), h: px('height'), n: m.textContent ?? '' };
    });
  }

  function solapan(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
    return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  }

  function conMesas(mesas: Record<string, unknown>[]) {
    const sdk = (globalThis as Record<string, unknown>).erplora as Record<string, unknown>;
    sdk.queryAll = async (name: string) => (name === 'tables.zones.list' ? ZONAS : mesas);
  }

  /** Lo que `tables.tables.list` devuelve HOY en un hub creado con la plantilla Restaurante. */
  const LEGADO = [
    ['Q1', 0, 0], ['Q2', 20, 0], ['Q3', 40, 0], ['Q4', 60, 0],
    ['Q5', 80, 0], ['Q6', 0, 20], ['Q7', 20, 20], ['Q8', 40, 20],
  ].map(([number, x, y]) => ({
    id: `t-${number}`, number, name: '', capacity: 4, shape: 'square', status: 'available',
    is_active: 1, zone_id: 'z1', position_x: x, position_y: y, width: 10, height: 10,
  }));

  it('cada mesa se pinta con SU tamaño, no con uno fijo', async () => {
    conMesas([
      { id: 'ancha', number: '1', name: '', capacity: 10, shape: 'rectangle', status: 'available', is_active: 1, zone_id: 'z1', position_x: 40, position_y: 40, width: 160, height: 90 },
    ]);
    const el = await montar();
    const [m] = rects(el);
    expect(m.w, 'la mesa larga de 10 se pinta larga').toBe(160);
    expect(m.h).toBe(90);
  });

  it('las coordenadas que hoy guarda un hub de restaurante NO se pintan apiladas', async () => {
    conMesas(LEGADO);
    const el = await montar();
    const r = rects(el);
    expect(r).toHaveLength(LEGADO.length);
    for (const [i, a] of r.entries()) {
      expect(a.w, `la caja de ${a.n} tiene que ser legible, no la unidad vieja`).toBeGreaterThanOrEqual(24);
      for (const b of r.slice(i + 1)) {
        expect(solapan(a, b), `${a.n} tapa a ${b.n}`).toBe(false);
      }
    }
  });

  it('los 12 números del Salón se leen todos', async () => {
    conMesas(Array.from({ length: 12 }, (_, i) => ({
      id: `s${i + 1}`, number: `S${i + 1}`, name: '', capacity: 4, shape: 'square', status: 'available',
      is_active: 1, zone_id: 'z1', position_x: (i % 5) * 20, position_y: Math.floor(i / 5) * 20, width: 10, height: 10,
    })));
    const el = await montar();
    const r = rects(el);
    expect(r).toHaveLength(12);
    for (const [i, a] of r.entries()) {
      // Sin esto el test es un falso verde: un ancho que no se pinta se lee NaN, y toda
      // comparación con NaN es false — «ninguna solapa» porque ninguna tiene tamaño.
      expect(Number.isFinite(a.w) && Number.isFinite(a.h), `${a.n} se pinta sin tamaño`).toBe(true);
      expect(a.w).toBeGreaterThanOrEqual(24);
      for (const b of r.slice(i + 1)) expect(solapan(a, b), `${a.n} tapa a ${b.n}`).toBe(false);
    }
  });

  it('lo que genera hoy `bulk_create` se pinta VERBATIM: el lienzo no tiene que rescatarlo', async () => {
    // Las coordenadas que emite el handler tras tables#53 (GAP 16, CELL 88, caja 72, 5 columnas).
    // Si el generador y el lienzo vuelven a divergir, esto se pone rojo antes que un hostelero.
    conMesas(Array.from({ length: 8 }, (_, i) => ({
      id: `b${i}`, number: `Q${i + 1}`, name: '', capacity: 4, shape: 'square', status: 'available',
      is_active: 1, zone_id: 'z1',
      position_x: 16 + (i % 5) * 88, position_y: 16 + Math.floor(i / 5) * 88, width: 72, height: 72,
    })));
    const el = await montar();
    const r = rects(el);
    expect(r[0]).toMatchObject({ x: 16, y: 16, w: 72, h: 72 });
    expect(r[1]).toMatchObject({ x: 104, y: 16 });
    expect(r[5]).toMatchObject({ x: 16, y: 104 });
    for (const [i, a] of r.entries()) {
      for (const b of r.slice(i + 1)) expect(solapan(a, b), `${a.n} tapa a ${b.n}`).toBe(false);
    }
  });

  it('una mesa colocada a mano en un hueco libre NO se mueve', async () => {
    conMesas([
      { id: 'a', number: '1', name: '', capacity: 4, shape: 'square', status: 'available', is_active: 1, zone_id: 'z1', position_x: 300, position_y: 200, width: 72, height: 72 },
      { id: 'b', number: '2', name: '', capacity: 4, shape: 'square', status: 'available', is_active: 1, zone_id: 'z1', position_x: 500, position_y: 200, width: 72, height: 72 },
    ]);
    const el = await montar();
    const r = rects(el);
    expect(r[0]).toMatchObject({ x: 300, y: 200 });
    expect(r[1]).toMatchObject({ x: 500, y: 200 });
  });

  it('«Añadir mesa» la coloca en un hueco LIBRE, no encima de otra', async () => {
    // Misma unidad mal usada que en el lote: la cascada era `20 + (n*16) % 200` con cajas de 72 px,
    // así que la mesa nueva nacía tapando a la anterior. El lienzo la recolocaría al recargar —y
    // el plano DA UN SALTO delante del encargado, que es lo que no puede pasar.
    const enviados: Record<string, unknown>[] = [];
    const existentes = Array.from({ length: 3 }, (_, i) => ({
      id: `e${i}`, number: String(i + 1), name: '', capacity: 4, shape: 'square', status: 'available',
      is_active: 1, zone_id: 'z1', position_x: 16 + i * 88, position_y: 16, width: 72, height: 72,
    }));
    conMesas(existentes);
    const sdk = (globalThis as Record<string, unknown>).erplora as Record<string, unknown>;
    sdk.command = async (name: string, payload: Record<string, unknown>) => {
      if (name === 'tables.tables.create') enviados.push(payload);
      return {};
    };
    const el = await montar();
    await (el as unknown as { addTable: () => Promise<void> }).addTable();

    expect(enviados).toHaveLength(1);
    const nueva = enviados[0] as { position_x: number; position_y: number; width: number; height: number };
    expect(nueva.width).toBe(72);
    for (const e of existentes) {
      expect(
        solapan({ x: nueva.position_x, y: nueva.position_y, w: nueva.width, h: nueva.height },
                { x: e.position_x, y: e.position_y, w: e.width, h: e.height }),
        `la mesa nueva nace encima de la ${e.number}`,
      ).toBe(false);
    }
  });

  it('mover una mesa NO le cambia el tamaño', async () => {
    // `tables.tables.move` persiste posición Y tamaño. Mandando `BOX` fijo, arrastrar una mesa
    // larga de 10 comensales la encogía a la caja por defecto — el plano dejaba de parecerse a la
    // sala en cuanto alguien la recolocaba.
    const enviados: Record<string, unknown>[] = [];
    conMesas([
      { id: 'ancha', number: '1', name: '', capacity: 10, shape: 'rectangle', status: 'available', is_active: 1, zone_id: 'z1', position_x: 40, position_y: 40, width: 160, height: 90 },
    ]);
    const sdk = (globalThis as Record<string, unknown>).erplora as Record<string, unknown>;
    sdk.command = async (name: string, payload: Record<string, unknown>) => {
      if (name === 'tables.tables.move') enviados.push(payload);
      return {};
    };
    const el = await montar();
    const mesa = el.shadowRoot.querySelector<HTMLElement>('.mesa')!;
    mesa.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));

    expect(enviados).toHaveLength(1);
    expect(enviados[0]).toMatchObject({ width: 160, height: 90 });
  });

  it('el solape se mira DENTRO de cada zona: dos zonas distintas pueden usar el mismo hueco', async () => {
    const sdk = (globalThis as Record<string, unknown>).erplora as Record<string, unknown>;
    sdk.queryAll = async (name: string) => (name === 'tables.zones.list'
      ? [...ZONAS, { id: 'z2', name: 'Terraza', color: '#0f0', sort_order: 2, is_active: 1 }]
      : [
          { id: 'a', number: '1', name: '', capacity: 4, shape: 'square', status: 'available', is_active: 1, zone_id: 'z1', position_x: 100, position_y: 100, width: 72, height: 72 },
          { id: 'b', number: '1', name: '', capacity: 4, shape: 'square', status: 'available', is_active: 1, zone_id: 'z2', position_x: 100, position_y: 100, width: 72, height: 72 },
        ]);
    const el = await montar();
    const salon = el.tables.find((t) => t.id === 'a');
    const terraza = el.tables.find((t) => t.id === 'b');
    expect(salon?.position_x, 'la mesa del Salón no se mueve por una de la Terraza').toBe(100);
    expect(terraza?.position_x, 'ni al revés: son planos distintos').toBe(100);
  });
});

// tables#16 / tables#11 — the floor plan is touch-first and keyboard-reachable.
//
// QA 10/08 exposed the 18 tables of the plan as `generic` («Disponible · 4 pax (clic para editar)»):
// a <div> with a pointerdown handler has no role, no focus, no keyboard. Every table is now a
// button-like element (role=button, tabindex=0, accessible name «nº · zone · capacity · status»),
// opens its editor with Enter/Space and moves with the arrow keys (persisted with
// `tables.tables.move`); pointer drag is untouched. The module's own controls leave `size="small"`
// (~27 px) and the ✕ of the sheets stop being native <button>s (Ionic conventions, tables#11).
describe('the plan is accessible: tables are buttons, controls are Ionic and ≥ 44px (tables#16, tables#11)', () => {
  const MESA = { id: 'a', number: '7', name: '', capacity: 4, shape: 'square', status: 'available', is_active: 1, zone_id: 'z1', position_x: 100, position_y: 50, width: 72, height: 72 };
  const comandos: { name: string; payload: Record<string, unknown> }[] = [];

  function stub() {
    comandos.length = 0;
    const sdk = (globalThis as Record<string, unknown>).erplora as Record<string, unknown>;
    sdk.queryAll = async (name: string) => (name === 'tables.zones.list' ? ZONAS : [MESA]);
    sdk.command = async (name: string, payload: Record<string, unknown>) => { comandos.push({ name, payload }); return {}; };
    sdk.t = (_c: unknown, key: string, params?: Record<string, unknown>) => (params ? `${key}:${Object.values(params).join(',')}` : key);
  }
  const tick = async (el: { updateComplete: Promise<unknown> }) => {
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 0));
    await el.updateComplete;
  };

  it('each table has role=button, is focusable and names itself «nº · zone · capacity · status»', async () => {
    stub();
    const el = await montar();
    const mesa = el.shadowRoot.querySelector('.mesa')!;
    expect(mesa.getAttribute('role')).toBe('button');
    expect(mesa.getAttribute('tabindex')).toBe('0');
    const name = mesa.getAttribute('aria-label') ?? '';
    expect(name, 'the accessible name carries the number').toContain('7');
    expect(name, 'the accessible name carries the zone').toContain('Salón');
    expect(name, 'the accessible name carries the capacity').toContain('ui.paxCount:4');
    expect(name, 'the accessible name carries the status').toContain('ui.statusAvailable');
  });

  it('Enter / Space on a table opens its editor', async () => {
    stub();
    const el = await montar();
    const mesa = el.shadowRoot.querySelector<HTMLElement>('.mesa')!;
    mesa.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await tick(el);
    expect(openWindow(el)?.querySelector('[data-testid="tables-floor-table-sheet"]'), 'Enter opens the table sheet').toBeTruthy();
  });

  it('arrow keys move the table one step and persist the position with tables.tables.move', async () => {
    stub();
    const el = await montar();
    const mesa = el.shadowRoot.querySelector<HTMLElement>('.mesa')!;
    mesa.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    await tick(el);
    const move = comandos.find((c) => c.name === 'tables.tables.move');
    expect(move, 'ArrowRight persists a move').toBeTruthy();
    expect(Number(move!.payload.position_x)).toBeGreaterThan(100);
    expect(Number(move!.payload.position_y)).toBe(50);
    expect(el.tables.find((t) => t.id === 'a')!.position_x).toBeGreaterThan(100);
  });

  it('no native <button> and no size="small" ion-button remain in the plan or its sheets', async () => {
    stub();
    const el = await montar();
    // open both sheets so their ✕ are rendered
    (el as unknown as { edit: unknown }).edit = { ...MESA };
    (el as unknown as { zoneEdit: unknown }).zoneEdit = { ...ZONAS[0] };
    await tick(el);
    expect(el.shadowRoot.querySelectorAll('button').length, 'native <button> outside Ionic').toBe(0);
    expect(el.shadowRoot.querySelectorAll('ion-button[size="small"]').length, 'size="small" targets (~27 px)').toBe(0);
    // the sheet close controls are Ionic buttons with an accessible name
    const closes = [...el.shadowRoot.querySelectorAll('ion-modal ion-header ion-button')];
    expect(closes.length).toBe(2);
    for (const c of closes) expect(c.getAttribute('aria-label')).toBe('ui.close');
  });

  it('the touch-target rule is in the component styles: ion-button min-height 44px', async () => {
    stub();
    const el = await montar();
    const cssText = ((el.constructor as unknown as { styles: { cssText: string } }).styles).cssText;
    expect(cssText).toMatch(/ion-button\s*\{[^}]*min-height:\s*44px/);
  });
});

// tables#182 (opened as sales#182) — the auto-layout of a room WITHOUT saved coordinates follows
// the natural order.
//
// The issue said the floor plan was safe because tables go by (x, y). That holds for a room the
// host has already arranged — but a room seeded by a blueprint has no coordinates, and then
// `autoLayoutTables` drops the tables into the grid IN THE ORDER THE QUERY RETURNED. With the old
// text order that grid read `S1 · S10 · S11 · S12 · S2 …`, the very same defect the picker had.
describe('auto-layout in natural order (tables#182)', () => {
  const ZONE = [{ id: 'z1', name: 'Salón', color: '#00f', sort_order: 1, is_active: 1 }];

  async function mountCanvas(numbers: string[]) {
    (globalThis as Record<string, unknown>).erplora = {
      query: async () => [],
      queryAll: async (name: string) => (name === 'tables.zones.list' ? ZONE : numbers.map((n, i) => ({
        id: `m${i}`, number: n, name: '', capacity: 4, shape: 'square', status: 'available',
        is_active: 1, zone_id: 'z1', position_x: 0, position_y: 0, width: 0, height: 0,
      }))),
      queryPage: async () => ({ rows: [], total: 0 }),
      command: async () => ({}),
      on: () => () => {},
      locale: 'es',
      t: (_c: unknown, key: string) => key,
    };
    await import('./erp-tables-canvas');
    const el = document.createElement('erp-tables-canvas') as HTMLElement & { shadowRoot: ShadowRoot };
    document.body.appendChild(el);
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    await new Promise((r) => setTimeout(r, 0));
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    return el;
  }

  /** Table labels in READING order: top row left→right, then the next one. */
  function reading(el: HTMLElement & { shadowRoot: ShadowRoot }): string[] {
    const px = (m: HTMLElement, prop: string) =>
      Number(/(-?\d+(?:\.\d+)?)px/.exec(m.style.getPropertyValue(prop))?.[1] ?? NaN);
    return [...el.shadowRoot.querySelectorAll<HTMLElement>('.mesa')]
      .map((m) => ({ x: px(m, 'left'), y: px(m, 'top'), n: (m.textContent ?? '').trim() }))
      .sort((a, b) => a.y - b.y || a.x - b.x)
      .map((m) => m.n.split(/\s+/)[0]);
  }

  it('a freshly seeded room is laid out S1, S2, S3 … S10, S11, S12', async () => {
    // Exactly the order the raw text sort used to hand over.
    const el = await mountCanvas(['S1', 'S10', 'S11', 'S12', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9']);
    expect(reading(el)).toEqual(
      ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'S11', 'S12'],
    );
  });
});

// ── tables#57 · tables#64 · tables#74 ─────────────────────────────────────────────────────────
//
// Shared harness for the three: a canvas mounted over a controllable table list, a controllable
// `hub.users.list` and a pinned clock.
const ZONE1 = [{ id: 'z1', name: 'Salón', color: '#00f', sort_order: 1, is_active: 1 }];
const CLOCK = new Date('2026-09-02T21:00:00Z');

/** A table row as `tables.tables.list` serves it, with the defaults of a placed table. */
function tableRow(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'a', number: '1', name: '', capacity: 4, shape: 'square', status: 'available',
    is_active: 1, zone_id: 'z1', position_x: 100, position_y: 100, width: 72, height: 72,
    ...over,
  };
}

function stubHub(tables: Record<string, unknown>[], users: unknown = []) {
  (globalThis as Record<string, unknown>).erplora = {
    // ADR-0192: the hub's people are a CORE query; the module consumes it like any other.
    query: async (name: string) => (name === 'hub.users.list' ? users : []),
    queryAll: async (name: string) => (name === 'tables.zones.list' ? ZONE1 : tables),
    queryPage: async () => ({ rows: [], total: 0 }),
    command: async () => ({}),
    on: () => () => {},
    locale: 'es',
    t: (_c: unknown, key: string, params?: Record<string, unknown>) =>
      (params ? `${key}:${Object.values(params).join(',')}` : key),
  };
}

type Canvas = HTMLElement & {
  shadowRoot: ShadowRoot;
  updateComplete: Promise<unknown>;
  tables: Array<{ id: string; position_x: number; position_y: number }>;
  now: () => Date;
};

async function mountCanvasEl(): Promise<Canvas> {
  await import('./erp-tables-canvas');
  const el = document.createElement('erp-tables-canvas') as Canvas;
  el.now = () => CLOCK;
  document.body.appendChild(el);
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
  return el;
}

const tiles = (el: Canvas) => [...el.shadowRoot.querySelectorAll<HTMLElement>('.mesa')];
const textOf = (root: ParentNode, sel: string) => (root.querySelector(sel)?.textContent ?? '').trim();

// tables#57 — (0,0) was used as the sentinel for «never placed», so a table dragged to the corner
// of the canvas jumped somewhere else on reload and the plan read as «it does not save».
//
// The sentinel that tells a placed table from a seeded one is NOT the coordinate: it is the BOX.
// Every writer that positions a table persists a real box (`tables.tables.move` and the canvas
// «add table» send 72; `bulk_create` has sent `BOX` since tables#53). A row that never went
// through one of them still carries the old unit (10, or 0 from a blueprint) — which `MIN_BOX`
// already treats as «not a box anybody chose», in the WC and in the Rust handler alike. So the
// question the layout has to answer is «has anybody ever placed this table?», and the box answers
// it per row, for free, without a migration and without (0,0) being special.
describe('(0,0) is a REAL position once the table has been placed (tables#57)', () => {
  it('a table placed at (0,0) is still at (0,0) after a reload', async () => {
    stubHub([
      tableRow({ id: 'corner', number: 'Q3', position_x: 0, position_y: 0, width: 72, height: 72 }),
      tableRow({ id: 'far', number: 'Q4', position_x: 300, position_y: 200, width: 72, height: 72 }),
    ]);
    const el = await mountCanvasEl();
    const corner = el.tables.find((t) => t.id === 'corner');
    expect(corner?.position_x, 'the corner of the canvas is a legitimate coordinate').toBe(0);
    expect(corner?.position_y).toBe(0);
  });

  it('and it is PAINTED there, not only kept in the model', async () => {
    stubHub([tableRow({ id: 'corner', number: 'Q3', position_x: 0, position_y: 0, width: 72, height: 72 })]);
    const el = await mountCanvasEl();
    const [tile] = tiles(el);
    expect(tile.style.getPropertyValue('left')).toBe('0px');
    expect(tile.style.getPropertyValue('top')).toBe('0px');
  });

  it('a table that was NEVER placed (old-unit box) is still spread out — #271 does not regress', async () => {
    stubHub(Array.from({ length: 5 }, (_, i) => tableRow({
      id: `seed${i}`, number: String(i + 1), position_x: 0, position_y: 0, width: 10, height: 10,
    })));
    const el = await mountCanvasEl();
    const atOrigin = el.tables.filter((t) => t.position_x === 0 && t.position_y === 0);
    expect(atOrigin.length, 'seeded tables must not pile up in the corner').toBeLessThan(el.tables.length);
  });

  it('an unplaced table never lands on top of a placed one', async () => {
    stubHub([
      tableRow({ id: 'corner', number: 'Q3', position_x: 0, position_y: 0, width: 72, height: 72 }),
      tableRow({ id: 'seed', number: 'Q9', position_x: 0, position_y: 0, width: 10, height: 10 }),
    ]);
    const el = await mountCanvasEl();
    const seed = el.tables.find((t) => t.id === 'seed')!;
    expect(seed.position_x === 0 && seed.position_y === 0, 'the seeded table sits on the placed one').toBe(false);
    expect(el.tables.find((t) => t.id === 'corner')!.position_x, 'and the placed one did not move').toBe(0);
  });
});

// tables#64 — «Available» was a 2 px green border and nothing else. A colour-blind waiter (≈8 % of
// men) read the plan as four identical tiles, and at arm's length so did everybody else. The
// product already solved it in the POS «choose table» modal, which writes DISPONIBLE under the
// «4 pax»; Square and Toast do the same (colour AND text/icon). Here the tile carries the three:
// colour, the written status, and an icon that differs per status.
describe('the status of a table is WRITTEN, not only painted (tables#64)', () => {
  it('every tile writes its status', async () => {
    stubHub([
      tableRow({ id: 'a', number: '1', status: 'available' }),
      tableRow({ id: 'b', number: '2', status: 'blocked', position_x: 300 }),
    ]);
    const el = await mountCanvasEl();
    expect(textOf(tiles(el)[0], '.s')).toBe('ui.statusAvailable');
    expect(textOf(tiles(el)[1], '.s')).toBe('ui.statusBlocked');
  });

  it('and carries an icon of its own: the four statuses use four different icons', async () => {
    const icons: string[] = [];
    for (const [i, status] of ['available', 'occupied', 'reserved', 'blocked'].entries()) {
      stubHub([tableRow({ id: `t${i}`, number: String(i), status })]);
      const el = await mountCanvasEl();
      const icon = tiles(el)[0].querySelector('.s ion-icon');
      expect(icon, `«${status}» paints no icon: the status lives only in the colour`).toBeTruthy();
      // Decorative: the status is already in the text and in the accessible name.
      expect(icon!.getAttribute('aria-hidden')).toBe('true');
      icons.push(icon!.getAttribute('name') ?? '');
      el.remove();
    }
    expect(new Set(icons).size, `two statuses share an icon: ${icons.join(', ')}`).toBe(4);
  });

  it('an occupied table paints the seated party and how long it has been sitting, not the capacity', async () => {
    stubHub([tableRow({
      id: 'a', number: '12', capacity: 4, status: 'occupied',
      live_guests: 3, live_since: '2026-09-02T20:25:00Z',
    })]);
    const el = await mountCanvasEl();
    // The tile is 72 px wide, so it says «3 pax · 35 min» — the same unit the capacity uses right
    // there. «3 comensales» came out clipped mid-word in a real browser at 390 px, so the
    // unambiguous wording lives in the accessible name, where there is room.
    const line = textOf(tiles(el)[0], '.c');
    expect(line, 'the seated party is what the floor manager reads, not the capacity').toContain('ui.paxCount:3');
    expect(line, '35 minutes seated').toContain('ui.durationMinutes:35');
    const name = tiles(el)[0].getAttribute('aria-label') ?? '';
    expect(name, 'the accessible name spells out that those 3 are SEATED').toContain('ui.liveGuests:3');
    expect(name).toContain('ui.durationMinutes:35');
  });

  it('a free table keeps painting its capacity', async () => {
    stubHub([tableRow({ id: 'a', number: '12', capacity: 6, status: 'available' })]);
    const el = await mountCanvasEl();
    expect(textOf(tiles(el)[0], '.c')).toBe('ui.paxCount:6');
  });
});

// tables#64 (second half) — at 390 px there were ~340 px of chrome before the first table: the
// view title (already painted by the shell topbar), a stray «Zone» input with «Add zone», «Add
// table», the zone segment and the colour legend, each on its own row. The waiter opening the plan
// on a phone saw two administration buttons and a legend; the tables, what he came for, sat in the
// last 55 % of the screen. Square keeps the plan full-screen on mobile and puts editing behind
// «Edit».
describe('the plan fits on a phone: the header collapses (tables#64)', () => {
  it('does not repeat the view title — the shell topbar already paints it', async () => {
    stubHub([tableRow()]);
    const el = await mountCanvasEl();
    expect(el.shadowRoot.querySelector('h2'), 'the title is painted twice').toBeNull();
  });

  it('drops the colour legend: the status is written on every tile', async () => {
    stubHub([tableRow()]);
    const el = await mountCanvasEl();
    expect(el.shadowRoot.querySelector('.legend'), 'a legend of colours next to written statuses').toBeNull();
  });

  it('«add zone» and «add table» are behind ONE control, not two rows of the header', async () => {
    stubHub([tableRow()]);
    const el = await mountCanvasEl();
    const labels = [...el.shadowRoot.querySelectorAll('ion-button')].map((b) => (b.textContent ?? '').trim());
    expect(labels, 'the admin buttons are still inline').not.toContain('ui.addZone');
    expect(labels, 'the admin buttons are still inline').not.toContain('ui.addTable');
    expect(el.shadowRoot.querySelector('ion-button[data-testid="tables-floor-add"]'), 'no single «add» control').toBeTruthy();
  });

  it('the «add» control opens a sheet with both actions and works with NO zones yet', async () => {
    stubHub([]);
    (globalThis as Record<string, unknown>).erplora = {
      ...((globalThis as Record<string, unknown>).erplora as object),
      queryAll: async () => [],
    };
    const el = await mountCanvasEl();
    const add = el.shadowRoot.querySelector<HTMLElement>('ion-button[data-testid="tables-floor-add"]');
    expect(add, 'with no zones there is no way to create the first one').toBeTruthy();
    add!.click();
    await el.updateComplete;
    const sheet = openWindow(el);
    expect(sheet, 'the «add» control opens nothing').toBeTruthy();
    const labels = [...sheet!.querySelectorAll('ion-button')].map((b) => (b.textContent ?? '').trim());
    expect(labels).toContain('ui.addZone');
    expect(labels).toContain('ui.addTable');
  });

  it('nothing above the canvas but the zone segment and its two controls', async () => {
    stubHub([tableRow()]);
    const el = await mountCanvasEl();
    const canvas = el.shadowRoot.querySelector('.canvas')!;
    const before = [...el.shadowRoot.children]
      .filter((n) => n.tagName !== 'STYLE')
      .filter((n) => (n.compareDocumentPosition(canvas) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0);
    expect(
      before.length,
      `too much chrome before the plan: ${before.map((n) => n.tagName + '.' + n.className).join(', ')}`,
    ).toBeLessThanOrEqual(1);
  });
});

// tables#74 — `waiter_id` travels on the session since tables#70 and the plan threw it away. The
// name is resolved the way kitchen's KDS card and the printed chit already do it (ADR-0192,
// kitchen#63): `hub.users.list`, the CORE namespace. Without a resolvable name the tile shows
// nothing — a UUID on a table read from two metres away is worse than a blank.
describe('the plan says WHO is serving the occupied table (tables#74)', () => {
  const OCCUPIED = tableRow({
    id: 'a', number: '12', status: 'occupied', live_guests: 3,
    live_since: '2026-09-02T20:25:00Z', live_waiter_id: 'u-7',
  });

  it('paints the NAME of the waiter, never the id', async () => {
    stubHub([OCCUPIED], [{ id: 'u-7', name: 'Marta' }, { id: 'u-9', name: 'Luis' }]);
    const el = await mountCanvasEl();
    const tile = tiles(el)[0];
    expect(textOf(tile, '.w')).toBe('Marta');
    expect(tile.textContent ?? '', 'a raw uuid on the plan').not.toContain('u-7');
  });

  it('an id the hub does not list leaves a blank, not a uuid', async () => {
    stubHub([OCCUPIED], [{ id: 'u-9', name: 'Luis' }]);
    const el = await mountCanvasEl();
    expect(tiles(el)[0].querySelector('.w')).toBeNull();
    expect(tiles(el)[0].textContent ?? '').not.toContain('u-7');
  });

  it('if hub.users.list fails the plan still paints — degraded, never broken', async () => {
    stubHub([OCCUPIED]);
    ((globalThis as Record<string, unknown>).erplora as { query: unknown }).query = async () => {
      throw new Error('no permission');
    };
    const el = await mountCanvasEl();
    expect(tiles(el).length, 'the plan died because the people could not be listed').toBe(1);
    expect(tiles(el)[0].querySelector('.w')).toBeNull();
  });

  it('the waiter is in the accessible name of the tile too', async () => {
    stubHub([OCCUPIED], [{ id: 'u-7', name: 'Marta' }]);
    const el = await mountCanvasEl();
    expect(tiles(el)[0].getAttribute('aria-label') ?? '').toContain('Marta');
  });
});

// ── tables#83 · tables#84 ─────────────────────────────────────────────────────────────────────
//
// Two defects of the SAME two sheets of the floor plan («Add» and «Edit table»), so they share a
// harness.
//
// tables#83 — the «Add» sheet showed ONE text field (labelled «Zone») and TWO actions. «Add zone»
// used it; «Add table» IGNORED it and created the table with a running number. Typing «QA1» and
// tapping «Add table» produced a table called «1», with no warning. A field that discards what you
// type is worse than no field: it promises something it does not do, and whoever names their
// tables (M1, Terraza-3, Barra-1…) only finds out afterwards, one rename at a time.
//
// The market splits in two and the winner serves both sides. Lightspeed K-Series, Clover Dining
// and Square's «Custom Table Names» ask for the name when the table is created; TouchBistro, Odoo,
// Toast and Revel drop the table with a running number and let you rename it — but NONE of them
// shows a field it then throws away: the ones that do not ask simply have no field. Square names
// the choice outright («Custom Table Names» or «Automatic Table Names»), and that is what is fixed
// here: each action gets its OWN labelled field, what you type in the table one is the number of
// the table, and left blank the running number still does the job. Full table in the issue.
//
// tables#84 — `.field` is a COLUMN flex box, and its child rule said `flex: 1 1 11rem`. In a
// column container the basis is the HEIGHT, so every field claimed 176 px for a ~56 px control:
// that is the 100+ px of blank the QA measured between «Number / Capacity» and «Name», and the
// hole between the field and the buttons of «Add». happy-dom does no layout, but it does resolve
// the cascade, so the contract that makes the layout possible is assertable right here.

/** Records every command the sheets fire, so a test reads WHAT was sent, not what was typed. */
function recordCommands(): Array<{ name: string; payload: Record<string, unknown> }> {
  const sent: Array<{ name: string; payload: Record<string, unknown> }> = [];
  const sdk = (globalThis as Record<string, unknown>).erplora as Record<string, unknown>;
  sdk.command = async (name: string, payload: Record<string, unknown>) => {
    sent.push({ name, payload });
    return {};
  };
  return sent;
}

async function settle(el: Canvas) {
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
}

async function openAddSheet(el: Canvas): Promise<HTMLElement> {
  el.shadowRoot.querySelector<HTMLElement>('ion-button[data-testid="tables-floor-add"]')!.click();
  await el.updateComplete;
  const sheet = openWindow(el);
  if (!sheet) throw new Error('the «add» control opened no sheet');
  return sheet;
}

/** Types into an Ionic control the way the component listens to it (`ionInput` on the target). */
function typeInto(root: ParentNode, selector: string, value: string) {
  const input = root.querySelector<HTMLElement & { value: string }>(selector);
  if (!input) throw new Error(`the sheet has no field matching ${selector}`);
  input.value = value;
  input.dispatchEvent(new CustomEvent('ionInput'));
}

const buttonNamed = (root: ParentNode, label: string) =>
  [...root.querySelectorAll<HTMLElement>('ion-button')].find((b) => (b.textContent ?? '').trim() === label);

/** Opens the «Edit table» sheet of the tile that reads `number`, the way a person opens it. */
function openTableEdit(el: Canvas, number: string) {
  const tile = tiles(el).find((m) => (m.textContent ?? '').includes(number));
  if (!tile) throw new Error(`no tile of the plan reads «${number}»`);
  tile.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
}

const ZONE_FIELD = 'ion-input[data-testid="tables-floor-new-zone-name"]';
const TABLE_FIELD = 'ion-input[data-testid="tables-floor-new-table-number"]';

describe('the «Add» sheet of the floor plan honours what you type (tables#83)', () => {
  it('what you type in the table field IS the number of the table it creates', async () => {
    stubHub([tableRow({ id: 't1', number: '1' })]);
    const el = await mountCanvasEl();
    const sent = recordCommands();
    const sheet = await openAddSheet(el);
    typeInto(sheet, TABLE_FIELD, 'QA1');
    buttonNamed(sheet, 'ui.addTable')!.click();
    await settle(el);
    const created = sent.find((c) => c.name === 'tables.tables.create');
    expect(created, 'tapping «add table» created nothing').toBeTruthy();
    expect(created!.payload.number, 'the name typed by the user was thrown away').toBe('QA1');
  });

  it('left blank, the table still gets the next running number', async () => {
    stubHub([tableRow({ id: 't1', number: '1' })]);
    const el = await mountCanvasEl();
    const sent = recordCommands();
    const sheet = await openAddSheet(el);
    buttonNamed(sheet, 'ui.addTable')!.click();
    await settle(el);
    expect(sent.find((c) => c.name === 'tables.tables.create')!.payload.number).toBe('2');
  });

  it('the running number skips a number already used in the zone', async () => {
    // Two tables, «1» and «3»: counting them and adding one lands on «3» again, and the plan ends
    // up with two tiles reading the same number.
    stubHub([tableRow({ id: 't1', number: '1' }), tableRow({ id: 't3', number: '3' })]);
    const el = await mountCanvasEl();
    const sent = recordCommands();
    const sheet = await openAddSheet(el);
    buttonNamed(sheet, 'ui.addTable')!.click();
    await settle(el);
    const created = sent.find((c) => c.name === 'tables.tables.create')!;
    expect(created.payload.number, 'the new table repeats a number already on the plan').not.toBe('3');
    expect(created.payload.number).toBe('4');
  });

  it('the zone field and the table field are separate: neither leaks into the other', async () => {
    stubHub([tableRow({ id: 't1', number: '1' })]);
    const el = await mountCanvasEl();
    const sent = recordCommands();
    const sheet = await openAddSheet(el);
    typeInto(sheet, ZONE_FIELD, 'Terraza');
    buttonNamed(sheet, 'ui.addTable')!.click();
    await settle(el);
    expect(sent.find((c) => c.name === 'tables.tables.create')!.payload.number)
      .not.toBe('Terraza');

    const sheet2 = await openAddSheet(el);
    typeInto(sheet2, TABLE_FIELD, 'M7');
    buttonNamed(sheet2, 'ui.addZone')!.click();
    await settle(el);
    const zone = sent.find((c) => c.name === 'tables.zones.create');
    expect(zone, 'the zone was not created from its own field').toBeTruthy();
    expect(zone!.payload.name, 'the table number became the name of the zone').not.toBe('M7');
  });

  it('the zone field still names the zone it creates', async () => {
    stubHub([tableRow({ id: 't1', number: '1' })]);
    const el = await mountCanvasEl();
    const sent = recordCommands();
    const sheet = await openAddSheet(el);
    typeInto(sheet, ZONE_FIELD, 'Terraza');
    buttonNamed(sheet, 'ui.addZone')!.click();
    await settle(el);
    expect(sent.find((c) => c.name === 'tables.zones.create')!.payload.name).toBe('Terraza');
  });
});

describe('the sheets read as a form, not as a broken screen (tables#84)', () => {
  /** Asserts the layout contract over the fields of the sheet that is open RIGHT NOW.
   *  A closed sheet is detached from the DOM and `getComputedStyle` goes blank on it, so every
   *  sheet is measured while it is on screen. */
  function assertFieldsAreContiguous(el: Canvas, which: string): number {
    // tables#107 — the fields are Ionic grid columns inside the sheet's ion-modal now.
    const fields = [...(openWindow(el)?.querySelectorAll<HTMLElement>('ion-col') ?? [])]
      .filter((col) => col.querySelector('ion-input, ion-select'));
    expect(fields.length, `the «${which}» sheet painted no field — the check would be vacuous`).toBeGreaterThan(0);
    for (const field of fields) {
      const controls = [...field.querySelectorAll<HTMLElement>('ion-input, ion-select')];
      expect(controls.length, `a field of «${which}» with no control in it`).toBeGreaterThan(0);
      for (const control of controls) {
        const cs = getComputedStyle(control);
        const label = control.getAttribute('label') ?? control.tagName;
        // happy-dom only reports what the cascade actually DECLARES, so «not declared» ('') is the
        // healthy answer here and a length is the defect. `flex: 1 1 11rem` reports '11rem'.
        expect(
          ['', 'auto', 'content'],
          `«${label}» (${which}) claims «${cs.flexBasis}» of HEIGHT inside its field`,
        ).toContain(cs.flexBasis);
        expect(
          ['', '0'],
          `«${label}» (${which}) grows to «${cs.flexGrow}» and fills the height of its field`,
        ).toContain(cs.flexGrow);
        expect(control.getAttribute('style') ?? '', `«${label}» (${which}) pins a size inline`).not.toMatch(/height|flex/);
      }
    }
    return fields.length;
  }

  it('no control of the three sheets claims a fixed slice of HEIGHT', async () => {
    stubHub([tableRow()]);
    const el = await mountCanvasEl();
    let seen = 0;

    await openAddSheet(el);
    seen += assertFieldsAreContiguous(el, 'add');
    (el as unknown as { addOpen: boolean }).addOpen = false;
    await el.updateComplete;

    el.shadowRoot.querySelector<HTMLElement>('.mesa')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await el.updateComplete;
    seen += assertFieldsAreContiguous(el, 'edit table');
    (el as unknown as { edit: unknown }).edit = undefined;
    await el.updateComplete;

    // Opening the zone sheet goes through `tables.zones.get`, so it needs the microtask flush.
    el.shadowRoot.querySelector<HTMLElement>('ion-button[aria-label="ui.editZone"]')!.click();
    await settle(el);
    seen += assertFieldsAreContiguous(el, 'edit zone');

    // The check has to see the positive: if the sheets stopped opening, «no bad field» would be
    // true of an empty list.
    expect(seen, 'too few fields measured — the three sheets did not open').toBeGreaterThanOrEqual(7);
  });
});

// tables#83 (second half) — letting the person type the number opens a door the old sheet did not
// have: typing a number that is already on the plan. The running number was taught to skip what is
// taken, so accepting a TYPED duplicate would contradict the guard we just shipped and put two
// tiles reading the same thing in front of the waiter — with nothing in the database to stop it
// (there is no UNIQUE on `tables_table.number`). Both doors that write a number close here: the
// «Add» sheet and the rename of «Edit table», which never checked either.
describe('the floor plan refuses to hand out the same number twice (tables#83)', () => {
  it('typing a number another table of the zone already answers to is refused, not duplicated', async () => {
    stubHub([tableRow({ id: 't1', number: 'M1' })]);
    const el = await mountCanvasEl();
    const sent = recordCommands();
    const sheet = await openAddSheet(el);
    typeInto(sheet, TABLE_FIELD, ' m1 '); // the same table, typed the way anybody types it
    buttonNamed(sheet, 'ui.addTable')!.click();
    await settle(el);
    expect(
      sent.find((c) => c.name === 'tables.tables.create'),
      'a second table «M1» was created: the plan now shows two tiles reading the same number',
    ).toBeFalsy();
    expect(
      el.shadowRoot.textContent ?? '',
      'the sheet swallowed the refusal instead of telling the person why nothing happened',
    ).toContain('ui.errTableNumberTaken');
  });

  it('a number taken in ANOTHER zone is free: zones number their own tables', async () => {
    stubHub([tableRow({ id: 't1', number: '1', zone_id: 'z-other' })]);
    const el = await mountCanvasEl();
    const sent = recordCommands();
    const sheet = await openAddSheet(el);
    typeInto(sheet, TABLE_FIELD, '1');
    buttonNamed(sheet, 'ui.addTable')!.click();
    await settle(el);
    expect(sent.find((c) => c.name === 'tables.tables.create')!.payload.number).toBe('1');
  });

  it('renaming a table onto another table’s number is refused too', async () => {
    stubHub([tableRow({ id: 't1', number: '1' }), tableRow({ id: 't2', number: '2', position_x: 300 })]);
    const el = await mountCanvasEl();
    const sent = recordCommands();
    openTableEdit(el, '2');
    await el.updateComplete;
    typeInto(el.shadowRoot, 'ion-input[label="ui.fieldNumber"]', '1');
    buttonNamed(el.shadowRoot, 'ui.save')!.click();
    await settle(el);
    expect(
      sent.find((c) => c.name === 'tables.tables.update'),
      'the rename went through and two tables now answer to «1»',
    ).toBeFalsy();
    expect(el.shadowRoot.textContent ?? '').toContain('ui.errTableNumberTaken');
  });

  it('saving a table WITHOUT changing its number still goes through (it is not its own duplicate)', async () => {
    stubHub([tableRow({ id: 't1', number: '1' }), tableRow({ id: 't2', number: '2', position_x: 300 })]);
    const el = await mountCanvasEl();
    const sent = recordCommands();
    openTableEdit(el, '2');
    await el.updateComplete;
    typeInto(el.shadowRoot, 'ion-input[label="ui.fieldCapacity"]', '6');
    buttonNamed(el.shadowRoot, 'ui.save')!.click();
    await settle(el);
    const saved = sent.find((c) => c.name === 'tables.tables.update');
    expect(saved, 'a plain edit was refused as if the table collided with itself').toBeTruthy();
    expect(saved!.payload.capacity).toBe(6);
  });
});

// tables#83 (review of tables#85) — a refusal that lands BEHIND the sheet is a refusal nobody reads.
// The sheets are a modal over the whole view (tables#107: an ion-modal), and the ONE error slot of the component was painted in the view
// underneath. So tapping «Add table» with a taken number did nothing the person could see: the sheet
// stayed open, the field kept its value, and the message sat dimmed under the overlay. The message
// has to live INSIDE the open sheet — `shadowRoot.textContent` containing it is not enough.
describe('a refused number is explained INSIDE the open sheet, not behind it (tables#83)', () => {
  const openSheet = (el: Canvas) => openWindow(el);

  it('the «Add» sheet says why the table was not created', async () => {
    stubHub([tableRow({ id: 't1', number: 'M1' })]);
    const el = await mountCanvasEl();
    recordCommands();
    const sheet = await openAddSheet(el);
    typeInto(sheet, TABLE_FIELD, 'M1');
    buttonNamed(sheet, 'ui.addTable')!.click();
    await settle(el);
    const open = openSheet(el);
    expect(open, 'the sheet closed on a refusal, taking the field away').toBeTruthy();
    expect(open!.textContent ?? '', 'the refusal is painted behind the scrim, not in the sheet')
      .toContain('ui.errTableNumberTaken');
  });

  it('the «Edit table» sheet says why the rename was refused', async () => {
    stubHub([tableRow({ id: 't1', number: '1' }), tableRow({ id: 't2', number: '2', position_x: 300 })]);
    const el = await mountCanvasEl();
    recordCommands();
    openTableEdit(el, '2');
    await el.updateComplete;
    typeInto(el.shadowRoot, 'ion-input[label="ui.fieldNumber"]', '1');
    buttonNamed(el.shadowRoot, 'ui.save')!.click();
    await settle(el);
    const open = openSheet(el);
    expect(open, 'the sheet closed on a refusal').toBeTruthy();
    expect(open!.textContent ?? '', 'the refusal is painted behind the scrim, not in the sheet')
      .toContain('ui.errTableNumberTaken');
  });
});

// …and the slot is CLEARED when a sheet opens: a refusal earned by the «Add» sheet must not greet
// the person at the top of «Edit table» as if that sheet had produced it.
describe('a sheet opens without the error another sheet earned (tables#83)', () => {
  it('after a refused add, opening «Edit table» shows no stale refusal', async () => {
    stubHub([tableRow({ id: 't1', number: 'M1' })]);
    const el = await mountCanvasEl();
    recordCommands();
    const sheet = await openAddSheet(el);
    typeInto(sheet, TABLE_FIELD, 'M1');
    buttonNamed(sheet, 'ui.addTable')!.click();
    await settle(el);
    expect(el.shadowRoot.textContent ?? '').toContain('ui.errTableNumberTaken');
    (el as unknown as { addOpen: boolean }).addOpen = false;
    await el.updateComplete;

    openTableEdit(el, 'M1');
    await el.updateComplete;
    const open = openWindow(el);
    expect(open, 'the edit sheet did not open').toBeTruthy();
    expect(open!.textContent ?? '', 'the refusal of the «Add» sheet leaked into «Edit table»')
      .not.toContain('ui.errTableNumberTaken');
  });
});
