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
    expect(el.shadowRoot.querySelector('ion-button.trigger'),
      'el icono de Mesa permanece disponible después de asignarla').toBeTruthy();

    el.shadowRoot.querySelector<HTMLElement>('ion-button.trigger')!.click();
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    await new Promise((r) => setTimeout(r, 0));
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    expect([...el.shadowRoot.querySelectorAll('ion-button')].some((b) => b.textContent?.trim() === 'ui.removeTable'),
      'Quitar mesa queda dentro de su selector, igual que Quitar cliente').toBe(true);
  });

  it('no cambia de mesa si sales informa de productos pendientes de enviar', async () => {
    const el = await montar();
    let cambios = 0;
    el.addEventListener('erp:order-context', () => { cambios += 1; });
    el.dispatchEvent(new CustomEvent('erp:pos-state', {
      detail: { pending_count: 2, kitchen_enabled: true }, bubbles: false,
    }));
    el.shadowRoot.querySelector<HTMLElement>('ion-button.trigger')!.click();
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    await new Promise((r) => setTimeout(r, 0));
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;

    el.shadowRoot.querySelector<HTMLElement>('.mesa')!.click();
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;

    expect(cambios, 'no emite un cambio de cuenta').toBe(0);
    expect((el as unknown as { open: boolean }).open, 'mantiene el selector abierto para explicar el bloqueo').toBe(true);
    expect((el as unknown as { error: string }).error).toContain('ui.sendPendingBeforeTable');
  });

  it('reemite la mesa restaurada cuando Ventas vuelve a montar sus slots', async () => {
    const el = await montar();
    const filler = el as unknown as {
      selectedId?: string; selectedLabel: string; updateComplete: Promise<unknown>;
    };
    filler.selectedId = 'tbl-1';
    filler.selectedLabel = 'Mesa 4';
    await filler.updateComplete;

    let detail: { table_id: string | null; label?: string; order_id?: string | null } | undefined;
    el.addEventListener('erp:order-context', (e) => { detail = (e as CustomEvent).detail; });
    el.dispatchEvent(new CustomEvent('erp:order-restored', {
      detail: { order_id: 'ord-1' }, bubbles: false,
    }));
    await new Promise((r) => setTimeout(r, 0));

    expect(detail).toEqual({ table_id: 'tbl-1', label: 'Mesa 4', order_id: 'ord-1' });
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

// ── «Dejar en la mesa» (decisión Ioan 2026-07-19): la cuenta VIVE en la mesa ──────────────────
// El TPV puede soltar una cuenta DE LA PANTALLA sin aparcarla: la mesa sigue ocupada con su
// cuenta y se recupera tocándola. Para eso el host emite `erp:order-detached`: el filler limpia
// SU selección local y NADA más — ni park ni close (eso liberaría la mesa, el mal de siempre).
describe('erp:order-detached: soltar de pantalla sin liberar la mesa', () => {
  it('limpia la selección local y NO ejecuta ningún comando de sesión', async () => {
    const comandos: string[] = [];
    (globalThis as Record<string, unknown>).erplora = {
      ...((globalThis as Record<string, unknown>).erplora as object),
      command: async (name: string) => { comandos.push(name); return {}; },
    };
    const el = await montar();
    const filler = el as unknown as {
      selectedId?: string; selectedLabel: string; sessionId?: string; updateComplete: Promise<unknown>;
    };
    filler.selectedId = 'tbl-1';
    filler.selectedLabel = 'Mesa 4';
    filler.sessionId = 'ses-1';

    el.dispatchEvent(new CustomEvent('erp:order-detached', { detail: {}, bubbles: false }));
    await filler.updateComplete;

    expect(filler.selectedId, 'la selección de pantalla se limpia').toBeUndefined();
    expect(filler.sessionId).toBeUndefined();
    expect(comandos.filter((c) => c.includes('sessions')), 'la sesión NO se toca: la mesa sigue ocupada')
      .toEqual([]);
  });
});

// La X del chip = QUITAR LA MESA = aparcar la sesión (decisión Ioan 2026-07-19): la mesa queda
// libre y la sesión sobrevive como «aparcada» (ADR-0146), recuperable. Antes la X CERRABA la
// sesión (terminal): la cuenta perdía su rastro de servicio.
describe('la X del chip aparca la sesión, no la cierra', () => {
  it('clear() ejecuta tables.sessions.park (no close) y emite contexto nulo', async () => {
    const comandos: string[] = [];
    (globalThis as Record<string, unknown>).erplora = {
      ...((globalThis as Record<string, unknown>).erplora as object),
      command: async (name: string) => { comandos.push(name); return {}; },
    };
    const el = await montar();
    const filler = el as unknown as {
      selectedId?: string; sessionId?: string; clear(): Promise<void>;
    };
    filler.selectedId = 'tbl-1';
    filler.sessionId = 'ses-1';

    await filler.clear();

    expect(comandos).toContain('tables.sessions.park');
    expect(comandos).not.toContain('tables.sessions.close');
    expect(filler.selectedId).toBeUndefined();
  });

  it('el menu ⋮ de una mesa ocupada ofrece DIVIDIR la cuenta (tables#12)', async () => {
    // Cuatro comensales que quieren pagar por separado: hasta #12 el TPV no tenía por dónde. La
    // división se pide sobre la MISMA mesa (dos cuentas, un mantel), así que —a diferencia de
    // transferir/fusionar— no manda a elegir mesa destino: se ejecuta y se avisa a `sales`, que es
    // quien reparte las líneas.
    const comandos: { name: string; payload?: Record<string, unknown> }[] = [];
    (globalThis as Record<string, unknown>).erplora = {
      ...((globalThis as Record<string, unknown>).erplora as object),
      queryAll: async (name: string) => {
        if (name.includes('zone')) return [ZONA];
        if (name === 'tables.sessions.list') return [{ id: 'ses-1', table_id: 'tbl-1', status: 'active', order_id: 'ord-1' }];
        return [{ ...MESA, status: 'occupied' }];
      },
      query: async (name: string) => {
        if (name.includes('zone')) return [ZONA];
        if (name === 'tables.sessions.list') return [{ id: 'ses-1', table_id: 'tbl-1', status: 'active', order_id: 'ord-1' }];
        return [{ ...MESA, status: 'occupied' }];
      },
      command: async (name: string, payload?: Record<string, unknown>) => {
        comandos.push({ name, payload });
        return { new_ids: ['ses-2'] };
      },
    };
    const el = await montar();
    let split: { table_id?: string; from_order_id?: string; session_id?: string } | undefined;
    el.addEventListener('erp:order-split', (e) => { split = (e as CustomEvent).detail; });

    el.shadowRoot.querySelector<HTMLElement>('ion-button.trigger')!.click();
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    await new Promise((r) => setTimeout(r, 0));
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;

    el.shadowRoot.querySelector<HTMLElement>('.kebab')!.click();
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;

    const acciones = [...el.shadowRoot.querySelectorAll('.actions ion-button')];
    const dividir = acciones.find((b) => b.textContent?.includes('ui.split'));
    expect(dividir, 'el menú ⋮ debe ofrecer Dividir junto a Transferir y Fusionar').toBeTruthy();

    (dividir as HTMLElement).click();
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    await new Promise((r) => setTimeout(r, 0));

    const cmd = comandos.find((c) => c.name === 'tables.sessions.split');
    expect(cmd, 'dividir ejecuta tables.sessions.split').toBeTruthy();
    expect(cmd?.payload?.session_id, 'sobre la cuenta viva de la mesa').toBe('ses-1');
    expect(split?.from_order_id, 'sales recibe el pedido de la cuenta original').toBe('ord-1');
    expect(split?.session_id, 'y a qué cuenta nueva colgar el pedido que cree').toBe('ses-2');
  });

  it('una mesa reservada se pinta con su reserva, no solo con un color (tables#12)', async () => {
    // La leyenda «Reservada» existía desde el principio pero era inalcanzable. Ahora que se pinta,
    // tiene que decir DE QUIÉN es y HASTA cuándo: un color no le dice al encargado si le da tiempo
    // a sentar a alguien antes.
    (globalThis as Record<string, unknown>).erplora = {
      ...((globalThis as Record<string, unknown>).erplora as object),
      queryAll: async (name: string) => (name.includes('zone') ? [ZONA] : [{
        ...MESA, status: 'reserved', reserved_for: 'Ana', reserved_party_size: 4,
        reserved_from: '2026-08-07T21:00:00+00:00', reserved_until: '2026-08-07T23:00:00+00:00',
      }]),
    };
    const el = await montar();
    el.shadowRoot.querySelector<HTMLElement>('ion-button.trigger')!.click();
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    await new Promise((r) => setTimeout(r, 0));
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;

    const mesa = el.shadowRoot.querySelector('.mesa');
    expect(mesa?.textContent, 'el nombre de la reserva se pinta sobre la mesa').toContain('Ana');
    // La hora se pinta en la zona horaria DEL DISPOSITIVO —el encargado lee la hora de su reloj de
    // pared, no UTC—, así que la aserción va sobre la forma y no sobre un número concreto: fijar
    // «21:00» solo pasaría en un runner en UTC.
    const title = mesa?.getAttribute('title') ?? '';
    expect(title, 'con los comensales').toContain('Ana (4)');
    expect(title, 'y la franja horaria al alcance').toMatch(/\d{2}:\d{2}–\d{2}:\d{2}/);
  });
});

// ── tables#26 — `erp:order-linked` carries the account, not just the table ────────────────────
//
// Splitting a table (tables#12) leaves TWO live sessions on the same table. `link_order` without a
// `session_id` resolves to the OLDEST one on purpose (back-compat with the single-account POS), so
// a filler that drops the id makes the second order land on the first account: two sessions
// pointing at the same order, and both halves charging the same ticket.
//
// `sales` (sales#61) already republishes the `session_id` it got in `erp:order-split`, opaque and
// untouched. Honouring it here is what keeps the "one order = one session" invariant of tables#12.
describe('erp:order-linked — the split order lands on ITS own account (tables#26)', () => {
  /** Stubs the SDK and records every command call, so the payload can be asserted. */
  function stubSdk() {
    const calls: Array<{ name: string; payload?: Record<string, unknown> }> = [];
    (globalThis as Record<string, unknown>).erplora = {
      query: async () => [],
      queryAll: async () => [],
      command: async (name: string, payload?: Record<string, unknown>) => {
        calls.push({ name, payload });
        return {};
      },
      locale: 'es',
      t: (_c: unknown, key: string) => key,
    };
    return { calls };
  }

  const linkCalls = (calls: Array<{ name: string; payload?: Record<string, unknown> }>) =>
    calls.filter((c) => c.name === 'tables.sessions.link_order');

  it('links by session_id when the event carries one, never by table', async () => {
    const { calls } = stubSdk();
    const el = await montar();
    const filler = el as unknown as { selectedId?: string; updateComplete: Promise<unknown> };
    // The table IS selected, and its live account is the ORIGINAL one (ses-1). The order that just
    // arrived belongs to the NEW half (ses-2): linking by table would bury it in ses-1.
    filler.selectedId = 'tbl-1';
    await filler.updateComplete;

    el.dispatchEvent(new CustomEvent('erp:order-linked', {
      detail: { order_id: 'ord-2', session_id: 'ses-2' }, bubbles: false,
    }));
    await new Promise((r) => setTimeout(r, 0));

    const [link] = linkCalls(calls);
    expect(link, 'the link is written').toBeTruthy();
    expect(link?.payload?.session_id, 'on the account sales pointed at').toBe('ses-2');
    expect(link?.payload?.order_id).toBe('ord-2');
    expect(link?.payload?.table_id,
      'no table_id: it would resolve to the OLDEST account of the table').toBeUndefined();
  });

  it('links a split table that is NOT the selected one in the floor plan', async () => {
    const { calls } = stubSdk();
    const el = await montar();
    // Splitting is asked from the ⋮ of any table in the plan, which need not be the selected one.
    // Bailing out on a missing selection left the new account with no order at all.
    const filler = el as unknown as { selectedId?: string; updateComplete: Promise<unknown> };
    filler.selectedId = undefined;
    await filler.updateComplete;

    el.dispatchEvent(new CustomEvent('erp:order-linked', {
      detail: { order_id: 'ord-2', session_id: 'ses-2' }, bubbles: false,
    }));
    await new Promise((r) => setTimeout(r, 0));

    const [link] = linkCalls(calls);
    expect(link?.payload, 'the account id is enough to write the link').toEqual({
      session_id: 'ses-2', order_id: 'ord-2',
    });
  });

  it('falls back to the selected table when the event carries no session_id', async () => {
    const { calls } = stubSdk();
    const el = await montar();
    const filler = el as unknown as { selectedId?: string; updateComplete: Promise<unknown> };
    filler.selectedId = 'tbl-1';
    await filler.updateComplete;

    // The single-account POS never splits, so it publishes no session_id: today's path must stand.
    el.dispatchEvent(new CustomEvent('erp:order-linked', {
      detail: { order_id: 'ord-1' }, bubbles: false,
    }));
    await new Promise((r) => setTimeout(r, 0));

    const [link] = linkCalls(calls);
    expect(link?.payload, 'unchanged behaviour for the undivided table').toEqual({
      table_id: 'tbl-1', order_id: 'ord-1',
    });
  });

  it('writes nothing when there is neither a session_id nor a selected table', async () => {
    const { calls } = stubSdk();
    const el = await montar();
    const filler = el as unknown as { selectedId?: string; updateComplete: Promise<unknown> };
    filler.selectedId = undefined;
    await filler.updateComplete;

    el.dispatchEvent(new CustomEvent('erp:order-linked', {
      detail: { order_id: 'ord-1' }, bubbles: false,
    }));
    await new Promise((r) => setTimeout(r, 0));

    expect(linkCalls(calls), 'a counter order has no table to hang from').toEqual([]);
  });
});
