// Contrato del selector de MESA del TPV (slot `sales.pos.assign`, ADR-0043 B).
//
// El POS agrega mesa y cliente en UN modal de pestañas; este WC es el CONTENIDO de la pestaña
// "Mesa": se monta INLINE (sin botón-trigger ni modal propio), carga sus datos al montar y al
// pulsar una mesa emite `erp:order-context` para que la venta quede asociada. Mesa y cliente son
// independientes: elegir mesa no toca al cliente.
//
// Nada de `ion-modal` (dentro de un shadow root de Lit los overlays de Ionic se re-parentan a
// <body> y pierden el CSS, ADR-0028); el modal lo pone el POS, aquí solo va el picker.
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
  it('se monta INLINE: pinta las mesas al arrancar, sin botón-trigger ni overlay propio', async () => {
    const el = await montar();
    expect(el.shadowRoot.querySelector('ion-button.trigger'), 'no debe haber botón-trigger').toBeNull();
    expect(el.shadowRoot.querySelector('.scrim'), 'no debe haber overlay propio').toBeNull();
    expect(el.shadowRoot.querySelector('.mesa'), 'debe pintar la rejilla de mesas al montar').toBeTruthy();
  });

  it('al pulsar una mesa emite erp:order-context con la mesa elegida', async () => {
    const el = await montar();
    let detail: { table_id: string | null; label?: string } | undefined;
    el.addEventListener('erp:order-context', (e) => { detail = (e as CustomEvent).detail; });

    el.shadowRoot.querySelector<HTMLElement>('.mesa')!.click();
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    await new Promise((r) => setTimeout(r, 0));

    expect(detail?.table_id, 'la venta queda asociada a la mesa').toBe('tbl-1');
  });
});
