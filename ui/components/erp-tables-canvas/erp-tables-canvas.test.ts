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
