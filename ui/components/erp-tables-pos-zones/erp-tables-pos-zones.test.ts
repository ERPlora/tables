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
