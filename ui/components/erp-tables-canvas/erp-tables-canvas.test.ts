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

  it('las mesas con coords reales se respetan (no se reordenan)', async () => {
    const sdk = (globalThis as Record<string, unknown>).erplora as Record<string, unknown>;
    sdk.queryAll = async (name: string) => (name === 'tables.zones.list'
      ? ZONAS
      : [
          { id: 'a', number: '1', name: '', capacity: 4, shape: 'square', status: 'available', is_active: 1, zone_id: 'z1', position_x: 100, position_y: 50, width: 0, height: 0 },
          { id: 'b', number: '2', name: '', capacity: 4, shape: 'square', status: 'available', is_active: 1, zone_id: 'z1', position_x: 300, position_y: 50, width: 0, height: 0 },
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
    expect(el.shadowRoot.querySelector('.sheet'), 'Enter opens the table sheet').toBeTruthy();
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
    const closes = [...el.shadowRoot.querySelectorAll('.sheet-h ion-button')];
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
