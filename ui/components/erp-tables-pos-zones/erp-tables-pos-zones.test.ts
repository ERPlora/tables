// Contrato del selector de MESA del TPV (slot `sales.pos.assign`, ADR-0043 B).
//
// El POS monta ESTE WC en el header como UN botón-icono, independiente del de cliente (sin mezclar
// funcionalidades). El botón abre SU propio modal con las mesas por zona; al elegir una, emite
// `erp:order-context` y CIERRA el modal (el cajero vuelve al cobro). Mesa y cliente son
// independientes: elegir mesa no toca al cliente.
//
// Nada de `ion-modal` (dentro de un shadow root de Lit los overlays de Ionic se re-parentan a
// <body> y pierden el CSS, ADR-0028); el overlay es propio (scrim + panel).
import { beforeEach, describe, expect, it } from 'vitest';

const MESA = { id: 'tbl-1', number: '4', zone_id: 'z1', capacity: 4, status: 'available' };
const ZONA = { id: 'z1', name: 'Terraza' };

beforeEach(() => {
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string) => {
      if (name.includes('zone')) return [ZONA];
      if (name.includes('table')) return [MESA];
      return [];
    },
    queryAll: async (name: string) => {
      if (name.includes('zone')) return [ZONA];
      if (name.includes('table')) return [MESA];
      return [];
    },
    command: async () => ({}),
    locale: 'es',
    t: (_catalog: unknown, key: string) => key,
  };
});

async function montar() {
  await import('./erp-tables-pos-zones');
  const el = document.createElement('erp-tables-pos-zones');
  document.body.appendChild(el);
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  return el as HTMLElement & { shadowRoot: ShadowRoot };
}

describe('erp-tables-pos-zones', () => {
  it('el disparador es un botón-icono y el modal (<dialog>) arranca cerrado', async () => {
    const el = await montar();
    const boton = el.shadowRoot.querySelector('ion-button.trigger');
    expect(boton, 'debe haber un botón-trigger de mesa').toBeTruthy();
    expect(boton?.querySelector('ion-icon[slot="icon-only"]'), 'icono, sin texto').toBeTruthy();
    expect(boton?.getAttribute('aria-label'), 'con nombre accesible (ADR-0133)').toBeTruthy();
    // El modal es un <dialog> nativo (escapa al top layer); arranca cerrado.
    expect(el.shadowRoot.querySelector('dialog'), 'el picker usa <dialog> nativo').toBeTruthy();
    expect((el as unknown as { open: boolean }).open, 'cerrado al montar').toBe(false);
  });

  it('abre al pulsar, y al elegir una mesa emite erp:order-context y cierra', async () => {
    const el = await montar();
    let detail: { table_id: string | null; label?: string } | undefined;
    el.addEventListener('erp:order-context', (e) => { detail = (e as CustomEvent).detail; });

    el.shadowRoot.querySelector<HTMLElement>('ion-button.trigger')!.click();
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    await new Promise((r) => setTimeout(r, 0));
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    expect((el as unknown as { open: boolean }).open, 'se abre al pulsar').toBe(true);
    expect(el.shadowRoot.querySelector('.mesa'), 'pinta las mesas').toBeTruthy();

    el.shadowRoot.querySelector<HTMLElement>('.mesa')!.click();
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    await new Promise((r) => setTimeout(r, 0));

    expect(detail?.table_id, 'la venta queda asociada a la mesa').toBe('tbl-1');
    expect((el as unknown as { open: boolean }).open, 'al elegir se cierra').toBe(false);
  });
});

// Transferir / Fusionar (menú ⋮ de una mesa ocupada). El filler ejecuta el comando de sesión y
// emite hacia el POS el movimiento de comanda (erp:order-transfer / erp:order-merge).
describe('erp-tables-pos-zones — transferir / fusionar (⋮)', () => {
  const OCC = { id: 'tbl-1', number: '4', zone_id: 'z1', capacity: 4, status: 'occupied' };
  const FREE = { id: 'tbl-2', number: '5', zone_id: 'z1', capacity: 2, status: 'available' };
  const OCC2 = { id: 'tbl-3', number: '6', zone_id: 'z1', capacity: 2, status: 'occupied' };

  function setup(tables: Array<Record<string, unknown>>) {
    const calls: Array<{ name: string; payload?: Record<string, unknown> }> = [];
    (globalThis as Record<string, unknown>).erplora = {
      query: async (name: string) => {
        if (name.includes('zone')) return [ZONA];
        if (name.includes('session')) return [{ id: 's1' }]; // activeSessionFor → 's1'
        if (name.includes('table')) return tables;
        return [];
      },
      queryAll: async (name: string) => {
        if (name.includes('zone')) return [ZONA];
        if (name.includes('table')) return tables;
        return [];
      },
      command: async (name: string, payload?: Record<string, unknown>) => { calls.push({ name, payload }); return {}; },
      locale: 'es',
      t: (_c: unknown, key: string) => key,
    };
    return { calls };
  }

  async function abrir(el: HTMLElement & { shadowRoot: ShadowRoot }) {
    el.shadowRoot.querySelector<HTMLElement>('ion-button.trigger')!.click();
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    await new Promise((r) => setTimeout(r, 0));
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  }
  const tick = async (el: HTMLElement & { shadowRoot: ShadowRoot }) => {
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    await new Promise((r) => setTimeout(r, 0));
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  };

  it('el ⋮ solo aparece en mesas OCUPADAS', async () => {
    setup([OCC, FREE]);
    const el = await montar();
    await abrir(el);
    expect(el.shadowRoot.querySelectorAll('.kebab').length, 'una sola mesa ocupada → un ⋮').toBe(1);
  });

  it('Transferir → elige mesa LIBRE → ejecuta transfer y emite erp:order-transfer', async () => {
    const { calls } = setup([OCC, FREE]);
    const el = await montar();
    let d: { from_table_id: string; to_table_id: string } | undefined;
    el.addEventListener('erp:order-transfer', (e) => { d = (e as CustomEvent).detail; });
    await abrir(el);
    el.shadowRoot.querySelector<HTMLElement>('.kebab')!.click();
    await tick(el);
    // [0] = Transferir, [1] = Fusionar
    el.shadowRoot.querySelectorAll<HTMLElement>('.actions ion-button')[0].click();
    await tick(el);
    const targets = el.shadowRoot.querySelectorAll<HTMLElement>('.mesa.target');
    expect(targets.length, 'solo la mesa libre es destino válido').toBe(1);
    targets[0].click();
    await tick(el);
    expect(calls.some((c) => c.name === 'tables.sessions.transfer'), 'ejecuta el comando de sesión').toBe(true);
    expect(d?.from_table_id).toBe('tbl-1');
    expect(d?.to_table_id).toBe('tbl-2');
  });

  it('Fusionar → elige mesa OCUPADA → ejecuta merge y emite erp:order-merge', async () => {
    const { calls } = setup([OCC, OCC2, FREE]);
    const el = await montar();
    let d: { from_table_id: string; to_table_id: string } | undefined;
    el.addEventListener('erp:order-merge', (e) => { d = (e as CustomEvent).detail; });
    await abrir(el);
    // ⋮ de la primera ocupada (tbl-1)
    el.shadowRoot.querySelector<HTMLElement>('.kebab')!.click();
    await tick(el);
    el.shadowRoot.querySelectorAll<HTMLElement>('.actions ion-button')[1].click(); // Fusionar
    await tick(el);
    const targets = el.shadowRoot.querySelectorAll<HTMLElement>('.mesa.target');
    expect(targets.length, 'solo la OTRA mesa ocupada es destino válido').toBe(1);
    targets[0].click();
    await tick(el);
    expect(calls.some((c) => c.name === 'tables.sessions.merge'), 'ejecuta el comando de fusión').toBe(true);
    expect(d?.from_table_id).toBe('tbl-1');
    expect(d?.to_table_id).toBe('tbl-3');
  });
});

// ── Pulido QA 2026-07-19 (visto en Playwright, no en la suite) ────────────────────────────────
// (1) El botón de cerrar pintaba el literal «ui.close»: la clave no existía en los catálogos.
//     El stub de `t` devuelve la clave, así que el test que protege esto mira los JSON.
// (2) El empty-state «Sin mesas en esta zona» salía como texto estrujado en un panel encogido:
//     ahora lleva icono + pista de QUÉ hacer (crear mesas en el módulo Mesas) y aire.
import esCatalog from '../../../locales/es.json';
import enCatalog from '../../../locales/en.json';

describe('pulido del selector de mesas (QA 2026-07-19)', () => {
  it('la clave ui.close existe en AMBOS catálogos (el botón de cerrar no pinta literales)', () => {
    expect((esCatalog as { ui: Record<string, string> }).ui.close, 'es').toBeTruthy();
    expect((enCatalog as { ui: Record<string, string> }).ui.close, 'en').toBeTruthy();
  });

  it('el empty-state de zona sin mesas lleva icono y pista de qué hacer', async () => {
    (globalThis as Record<string, unknown>).erplora = {
      ...((globalThis as Record<string, unknown>).erplora as object),
      query: async (name: string) => (name.includes('zone') ? [{ id: 'z1', name: 'Terraza' }] : []),
      queryAll: async (name: string) => (name.includes('zone') ? [{ id: 'z1', name: 'Terraza' }] : []),
    };
    const el = await montar();
    (el as unknown as { open: boolean }).open = true;
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    await new Promise((r) => setTimeout(r, 0));
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;

    const vacio = el.shadowRoot!.querySelector('.empty');
    expect(vacio, 'el estado vacío existe').toBeTruthy();
    expect(vacio!.querySelector('ion-icon'), 'con icono, no texto suelto estrujado').toBeTruthy();
    expect(vacio!.textContent, 'y con la pista de qué hacer').toContain('ui.noTablesInZoneHint');
  });
});
