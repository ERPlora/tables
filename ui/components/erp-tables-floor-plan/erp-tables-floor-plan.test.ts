// Contrato de la BARRA de la lista de mesas.
//
// Ojo con el nombre: el plano de sala DE VERDAD (el mapa arrastrable) es `erp-tables-canvas`. Este
// componente es la LISTA de mesas en tabla, así que el «+» de la tabla sí es el sitio del alta.
//
// El alta de una mesa vive DENTRO de `ok-data-table`, detrás del «+» de su barra (panel
// `slot="create"`), como en /employees del core y en el CRUD de productos de `inventory`; no en un
// `<form>` suelto encima de la tabla. Tras crear con éxito el panel se cierra solo. Los filtros van
// dentro de la tabla, y los de dominio cerrado se eligen con un `select`: el estado (enum de la
// migración: available|occupied|reserved|blocked) y la zona (las zonas REALES del hub, que el
// servidor filtra por `eq` sobre el nombre de zona).
import { beforeEach, describe, expect, it } from 'vitest';

const ZONAS = [
  { id: 'z1', name: 'Terraza', color: '#0f0', sort_order: 1, is_active: 1 },
  { id: 'z2', name: 'Salón', color: '#00f', sort_order: 2, is_active: 1 },
];

const MESA = {
  id: 'm1',
  number: '12',
  name: '',
  capacity: 4,
  shape: 'square',
  status: 'available',
  is_active: 1,
  zone: 'Terraza',
  zone_id: 'z1',
};

const comandos: { name: string; payload: Record<string, unknown> }[] = [];

beforeEach(() => {
  comandos.length = 0;
  (globalThis as Record<string, unknown>).erplora = {
    query: async () => [],
    // El select de zonas las quiere TODAS → `queryAll` (ADR-0124). Si el doble solo ofreciera
    // `query`, empujaría al componente a la API que trunca a 50 filas en silencio.
    queryAll: async (name: string) => (name === 'tables.zones.list' ? ZONAS : []),
    queryPage: async () => ({ rows: [MESA], total: 1 }),
    command: async (name: string, payload: Record<string, unknown>) => {
      comandos.push({ name, payload });
      return {};
    },
    on: () => () => {},
    locale: 'es',
    t: (_catalog: unknown, key: string) => key,
  };
});

async function montar() {
  await import('./erp-tables-floor-plan');
  const el = document.createElement('erp-tables-floor-plan');
  document.body.appendChild(el);
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  return el as HTMLElement & { shadowRoot: ShadowRoot };
}

const tabla = (el: HTMLElement & { shadowRoot: ShadowRoot }) =>
  el.shadowRoot.querySelector('ok-data-table') as (HTMLElement & { addable: boolean; fill: boolean; close: () => void }) | null;

describe('el alta vive DENTRO de la tabla (paridad con /employees e inventory)', () => {
  it('la tabla declara `addable` → pinta el «+» en su barra', async () => {
    const el = await montar();
    expect(tabla(el)?.addable, 'sin `addable` no hay «+» en la barra de la tabla').toBe(true);
  });

  it('la tabla llena el alto del contenedor (`fill`): scroll interno, pager fijo', async () => {
    const el = await montar();
    expect(tabla(el)?.fill).toBe(true);
  });

  it('el formulario de alta se proyecta en el panel `create` de la tabla', async () => {
    const el = await montar();
    const form = el.shadowRoot.querySelector('form[slot="create"]');
    expect(form, 'el formulario de alta no está en el slot `create`').toBeTruthy();
    expect(form?.closest('ok-data-table'), 'el formulario de alta cuelga fuera de la tabla').toBeTruthy();
  });

  it('no queda NINGÚN control de alta suelto fuera de la tabla', async () => {
    const el = await montar();
    const sueltos = [...el.shadowRoot.querySelectorAll('form, ion-input, ion-select, ion-button')].filter(
      (n) => !n.closest('ok-data-table'),
    );
    expect(sueltos.map((n) => n.tagName.toLowerCase()), 'hay controles de alta fuera de la tabla').toEqual([]);
  });
});

describe('los filtros de dominio cerrado son `select`', () => {
  it('el estado se elige del enum de la migración', async () => {
    const el = await montar();
    const cols = (el as unknown as { columns: { key: string; filterType?: string; options?: { value: string }[] }[] }).columns;
    const estado = cols.find((c) => c.key === 'status');
    expect(estado?.filterType).toBe('select');
    expect(estado?.options?.map((o) => o.value)).toEqual(['available', 'occupied', 'reserved', 'blocked']);
  });

  it('la zona se elige entre las zonas REALES del hub, no se teclea', async () => {
    const el = await montar();
    const cols = (el as unknown as { columns: { key: string; filterType?: string; options?: { value: string; label: string }[] }[] }).columns;
    const zona = cols.find((c) => c.key === 'zone');
    expect(zona?.filterType, 'la zona se filtra con texto libre').toBe('select');
    expect(zona?.options?.map((o) => o.value), 'el select de zona no se puebla con las zonas del hub').toEqual(['Terraza', 'Salón']);
  });
});

describe('el alta sigue funcionando desde el panel', () => {
  it('crear manda tables.tables.create y CIERRA el panel de la tabla', async () => {
    const el = await montar();
    const t = tabla(el)!;
    let cerrado = 0;
    t.close = () => {
      cerrado += 1;
    };

    const wc = el as unknown as { newNumber: string; newCapacity: string; createTable: (ev: Event) => Promise<void> };
    wc.newNumber = '12';
    wc.newCapacity = '6';
    await wc.createTable(new Event('submit'));

    const alta = comandos.find((c) => c.name === 'tables.tables.create');
    expect(alta, 'no se mandó el alta de la mesa').toBeTruthy();
    expect(alta!.payload.number).toBe('12');
    expect(alta!.payload.capacity).toBe(6);
    expect(cerrado, 'el panel de alta se queda abierto tras crear').toBe(1);
  });

  // tables#3: the create form used to hardcode `zone_id: null` — every table born from the list
  // landed outside any zone and never showed on the floor plan's zone tabs. The zone is chosen from
  // the REAL zones of the hub (already loaded for the filter) and travels in the payload.
  it('the create form offers the zones of the hub and sends the chosen zone_id', async () => {
    const el = await montar();
    const zoneSelect = el.shadowRoot.querySelector('form[slot="create"] ion-select');
    expect(zoneSelect, 'the create form has no zone select').toBeTruthy();
    // happy-dom does not register Ionic: read the attribute, not the (undefined) property.
    const options = [...zoneSelect!.querySelectorAll('ion-select-option')].map((o) => o.getAttribute('value'));
    expect(options).toContain('z1');
    expect(options).toContain('z2');

    const wc = el as unknown as { newNumber: string; newZoneId: string; createTable: (ev: Event) => Promise<void> };
    wc.newNumber = '7';
    wc.newZoneId = 'z2';
    await wc.createTable(new Event('submit'));
    const alta = comandos.find((c) => c.name === 'tables.tables.create');
    expect(alta!.payload.zone_id).toBe('z2');
  });

  it('with no zone chosen the table is created without zone (zone_id null, still valid)', async () => {
    const el = await montar();
    const wc = el as unknown as { newNumber: string; createTable: (ev: Event) => Promise<void> };
    wc.newNumber = '8';
    await wc.createTable(new Event('submit'));
    expect(comandos.find((c) => c.name === 'tables.tables.create')!.payload.zone_id).toBeNull();
  });
});

// tables#182 (opened as sales#182) — the list shares the POS picker's NATURAL order.
//
// This list is paginated by the SERVER, so its order is decided by the `sort` it asks for, not by
// anything the browser can reorder afterwards: sorting the visible page in JS would order each
// page on its own and still cut the pages by the wrong key. `tables.tables.list` therefore exposes
// `number_sort` — the same per-row rule (numeric tail as a number, alphabetical otherwise) that
// the picker applies with `Intl.Collator`. The visible column stays `number`: the key is an
// implementation detail of the ordering, not a column anybody wants to read.
describe('orden natural de la lista (tables#182)', () => {
  /** Mounts capturing every `queryPage` call, so we can see WHICH sort the server is asked for. */
  async function montarEspiando() {
    const llamadas: Record<string, unknown>[] = [];
    const base = (globalThis as Record<string, unknown>).erplora as Record<string, unknown>;
    (globalThis as Record<string, unknown>).erplora = {
      ...base,
      queryPage: async (_name: string, params: Record<string, unknown>) => {
        llamadas.push(params);
        return { rows: [MESA], total: 1 };
      },
    };
    const el = await montar();
    return { el, llamadas };
  }

  it('arranca pidiendo `number_sort`, no el texto crudo de `name`', async () => {
    const { llamadas } = await montarEspiando();
    expect(llamadas.length, 'la lista carga al montar').toBeGreaterThan(0);
    expect(llamadas[0].sort, 'S2 antes que S10 lo decide el servidor').toBe('number_sort');
    expect(llamadas[0].dir).toBe('asc');
  });

  it('la tabla marca la columna VISIBLE («number»), no la clave de orden', async () => {
    const { el } = await montarEspiando();
    const t = el.shadowRoot.querySelector('ok-data-table') as HTMLElement & { sort?: string };
    expect(t?.sort, 'el indicador va sobre la columna que la gente lee').toBe('number');
  });

  it('ordenar por la columna «number» pide `number_sort` al servidor', async () => {
    const { el, llamadas } = await montarEspiando();
    const t = el.shadowRoot.querySelector('ok-data-table')!;
    llamadas.length = 0;
    t.dispatchEvent(new CustomEvent('sortChange', { detail: { sort: 'number', dir: 'desc' } }));
    await new Promise((r) => setTimeout(r, 0));
    expect(llamadas.map((c) => c.sort), 'el texto crudo volvería a dar S1, S10, S11, S12, S2…')
      .toEqual(['number_sort']);
    expect(llamadas[0].dir).toBe('desc');
  });

  it('el resto de columnas se siguen ordenando por sí mismas', async () => {
    const { el, llamadas } = await montarEspiando();
    const t = el.shadowRoot.querySelector('ok-data-table')!;
    llamadas.length = 0;
    t.dispatchEvent(new CustomEvent('sortChange', { detail: { sort: 'capacity', dir: 'asc' } }));
    await new Promise((r) => setTimeout(r, 0));
    expect(llamadas.map((c) => c.sort)).toEqual(['capacity']);
  });
});
