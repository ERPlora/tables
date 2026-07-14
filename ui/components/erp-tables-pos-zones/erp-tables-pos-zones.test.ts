// Contrato del selector de MESA del TPV (slot `sales.pos.order_context`, ADR-0043).
//
// Gemelo de `erp-customers-pos-search`: en la barra de contexto del carrito el espacio es escaso, así
// que el disparador es un ICONO con aria-label (ADR-0133), no un botón de texto a ancho completo.
// El camarero pulsa el icono → overlay con las mesas por zona → pulsa una → la venta queda asociada.
//
// El overlay es propio (scrim + panel), NO `ion-modal`: dentro de un shadow root de Lit los overlays
// de Ionic se re-parentan a <body> y pierden el CSS del componente (ADR-0028).
import { beforeEach, describe, expect, it } from 'vitest';

const MESA = { id: 'tbl-1', name: 'Mesa 4', zone_id: 'z1', seats: 4, status: 'free' };
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
  it('el disparador es un icono con nombre accesible, no un botón de texto', async () => {
    const el = await montar();
    const boton = el.shadowRoot.querySelector('ion-button.trigger');
    expect(boton).toBeTruthy();
    expect(boton?.querySelector('ion-icon[slot="icon-only"]')).toBeTruthy();
    expect(boton?.textContent?.trim()).toBe('');
    expect(boton?.getAttribute('aria-label')).toBeTruthy();
  });

  it('abre un overlay con las mesas', async () => {
    const el = await montar();
    el.shadowRoot.querySelector<HTMLElement>('ion-button.trigger')!.click();
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    await new Promise((r) => setTimeout(r, 0));
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;

    const dialogo = el.shadowRoot.querySelector('[role="dialog"]');
    expect(dialogo).toBeTruthy();
  });
});
