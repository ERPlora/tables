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
