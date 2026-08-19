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
      if (name.includes('session')) return []; // a free table has no live check
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
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    // tables#32: a free table asks for the covers before seating; confirm the default.
    el.shadowRoot.querySelector<HTMLElement>('.guests .seat')!.click();
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

// ── tables#37 — the trigger icon must travel in the module's own `dist/icons.json` ────────────
//
// The toolkit bakes ONLY the Iconify `ion:` set into the sidecar. The trigger used Material Symbols
// (`ms-table-restaurant(-outline)`), which the current baker no longer resolves: `dist/icons.json`
// had no entry for it, ion-icon tried the network, warned, and the button rendered BLANK. The
// contract: whatever the trigger renders (assigned or not) is a key of the baked sidecar.
import bakedIcons from '../../../dist/icons.json';

describe('the table trigger icon is baked in dist/icons.json (tables#37)', () => {
  const baked = bakedIcons as Record<string, string>;

  it('unassigned: the icon name resolves in the sidecar', async () => {
    const el = await montar();
    const name = el.shadowRoot.querySelector('ion-button.trigger ion-icon')?.getAttribute('name') ?? '';
    expect(name, 'the trigger has an icon name').toBeTruthy();
    expect(name.startsWith('ms-'), 'no Material Symbols: only the ion: set is baked').toBe(false);
    expect(baked[name], `"${name}" is baked in dist/icons.json`).toBeTruthy();
  });

  it('assigned: the icon name resolves in the sidecar too', async () => {
    const el = await montar();
    const filler = el as unknown as { selectedId?: string; updateComplete: Promise<unknown> };
    filler.selectedId = 'tbl-1';
    await filler.updateComplete;
    const name = el.shadowRoot.querySelector('ion-button.trigger ion-icon')?.getAttribute('name') ?? '';
    expect(name.startsWith('ms-'), 'no Material Symbols: only the ion: set is baked').toBe(false);
    expect(baked[name], `"${name}" is baked in dist/icons.json`).toBeTruthy();
  });
});

// ── tables#32 — covers are asked when the party sits, shown on the table, correctable later ──
//
// `guests_count` existed end to end (schema, handler, SQL, list query) but no UI asked for it: every
// table sat "1 pax" in silence — no per-cover average, no capacity warning, nothing for the kitchen.
// Market decision (Toast, Lightspeed, Square): seating a table asks the cover count first, defaults
// to the table capacity and offers a one-tap quick pick; the count is visible on the table and can
// be corrected while the check is open.
describe('covers on seating (tables#32)', () => {
  const FREE6 = { id: 'tbl-6', number: '6', zone_id: 'z1', capacity: 6, status: 'available' };
  const OCC = { id: 'tbl-1', number: '4', zone_id: 'z1', capacity: 4, status: 'occupied', live_guests: 3 };

  function stub(tables: Array<Record<string, unknown>>) {
    const calls: Array<{ name: string; payload?: Record<string, unknown> }> = [];
    (globalThis as Record<string, unknown>).erplora = {
      query: async (name: string, params?: Record<string, unknown>) => {
        if (name.includes('zone')) return [ZONA];
        // Only the occupied table has a live check; a free one must fall through to the prompt.
        if (name === 'tables.sessions.list') return params?.f_table_id === 'tbl-1' ? [{ id: 'ses-1', table_id: 'tbl-1', status: 'active' }] : [];
        return tables;
      },
      queryAll: async (name: string) => (name.includes('zone') ? [ZONA] : tables),
      command: async (name: string, payload?: Record<string, unknown>) => { calls.push({ name, payload }); return {}; },
      locale: 'es',
      t: (_c: unknown, key: string, params?: Record<string, unknown>) =>
        params ? `${key}:${Object.values(params).join(',')}` : key,
    };
    return { calls };
  }
  const tick = async (el: HTMLElement) => {
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    await new Promise((r) => setTimeout(r, 0));
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  };
  async function abrirYTocar(el: HTMLElement & { shadowRoot: ShadowRoot }, selector = '.mesa') {
    el.shadowRoot.querySelector<HTMLElement>('ion-button.trigger')!.click();
    await tick(el);
    el.shadowRoot.querySelector<HTMLElement>(selector)!.click();
    await tick(el);
  }

  it('touching a FREE table asks for the covers (default = capacity) instead of seating at once', async () => {
    const { calls } = stub([FREE6]);
    const el = await montar();
    await abrirYTocar(el);
    expect(calls.some((c) => c.name === 'tables.sessions.open'), 'no session yet: the covers come first').toBe(false);
    const prompt = el.shadowRoot.querySelector('.guests');
    expect(prompt, 'the covers prompt is shown').toBeTruthy();
    expect(prompt!.querySelector('.guests .value')?.textContent?.trim(), 'defaults to the table capacity').toBe('6');
    expect((el as unknown as { open: boolean }).open, 'the sheet stays open for the prompt').toBe(true);
  });

  it('confirming seats the party with the chosen covers (stepper +/−) and emits the context', async () => {
    const { calls } = stub([FREE6]);
    const el = await montar();
    let detail: { table_id: string | null } | undefined;
    el.addEventListener('erp:order-context', (e) => { detail = (e as CustomEvent).detail; });
    await abrirYTocar(el);
    el.shadowRoot.querySelector<HTMLElement>('.guests .minus')!.click();
    el.shadowRoot.querySelector<HTMLElement>('.guests .minus')!.click();
    await tick(el);
    expect(el.shadowRoot.querySelector('.guests .value')?.textContent?.trim()).toBe('4');
    el.shadowRoot.querySelector<HTMLElement>('.guests .seat')!.click();
    await tick(el);
    const open = calls.find((c) => c.name === 'tables.sessions.open');
    expect(open?.payload, 'opens with the covers').toEqual({ table_id: 'tbl-6', guests_count: 4 });
    expect(detail?.table_id).toBe('tbl-6');
    expect((el as unknown as { open: boolean }).open, 'and closes the sheet').toBe(false);
  });

  it('a quick-pick chip seats the party in ONE tap', async () => {
    const { calls } = stub([FREE6]);
    const el = await montar();
    await abrirYTocar(el);
    const chip = [...el.shadowRoot.querySelectorAll<HTMLElement>('.guests .quick button')]
      .find((b) => b.textContent?.trim() === '2');
    expect(chip, 'quick chips 1..8').toBeTruthy();
    chip!.click();
    await tick(el);
    expect(calls.find((c) => c.name === 'tables.sessions.open')?.payload).toEqual({ table_id: 'tbl-6', guests_count: 2 });
  });

  it('never goes below 1 and warns (without blocking) above the capacity', async () => {
    const { calls } = stub([{ ...FREE6, capacity: 1 }]);
    const el = await montar();
    await abrirYTocar(el);
    el.shadowRoot.querySelector<HTMLElement>('.guests .minus')!.click();
    await tick(el);
    expect(el.shadowRoot.querySelector('.guests .value')?.textContent?.trim(), 'floor at 1').toBe('1');
    el.shadowRoot.querySelector<HTMLElement>('.guests .plus')!.click();
    await tick(el);
    expect(el.shadowRoot.querySelector('.guests .over'), 'over-capacity warning shown').toBeTruthy();
    el.shadowRoot.querySelector<HTMLElement>('.guests .seat')!.click();
    await tick(el);
    expect(calls.find((c) => c.name === 'tables.sessions.open')?.payload?.guests_count, 'still seats').toBe(2);
  });

  it('cancelling the prompt seats nobody and keeps the plan', async () => {
    const { calls } = stub([FREE6]);
    const el = await montar();
    await abrirYTocar(el);
    el.shadowRoot.querySelector<HTMLElement>('.guests .back')!.click();
    await tick(el);
    expect(el.shadowRoot.querySelector('.guests')).toBeNull();
    expect(calls.some((c) => c.name === 'tables.sessions.open')).toBe(false);
    expect(el.shadowRoot.querySelector('.mesa'), 'back to the plan').toBeTruthy();
  });

  it('an OCCUPIED table shows the live covers of its party, not just the capacity', async () => {
    stub([OCC]);
    const el = await montar();
    el.shadowRoot.querySelector<HTMLElement>('ion-button.trigger')!.click();
    await tick(el);
    const cell = el.shadowRoot.querySelector('.mesa');
    expect(cell?.textContent, 'live covers on the cell').toContain('ui.liveGuests:3');
  });

  it('the ⋮ menu of an occupied table lets the waiter correct the covers of the open check', async () => {
    const { calls } = stub([OCC]);
    const el = await montar();
    await abrirYTocar(el, '.kebab');
    const btn = [...el.shadowRoot.querySelectorAll<HTMLElement>('.actions ion-button')]
      .find((b) => b.textContent?.includes('ui.guests'));
    expect(btn, 'Guests action in the ⋮ menu').toBeTruthy();
    btn!.click();
    await tick(el);
    expect(el.shadowRoot.querySelector('.guests .value')?.textContent?.trim(), 'pre-filled with the live covers').toBe('3');
    el.shadowRoot.querySelector<HTMLElement>('.guests .plus')!.click();
    await tick(el);
    el.shadowRoot.querySelector<HTMLElement>('.guests .seat')!.click();
    await tick(el);
    const set = calls.find((c) => c.name === 'tables.sessions.set_guests');
    expect(set?.payload, 'corrects the LIVE session').toEqual({ session_id: 'ses-1', guests_count: 4 });
    expect(calls.some((c) => c.name === 'tables.sessions.open'), 'no new session').toBe(false);
  });

  it('the new keys exist in both catalogues', () => {
    for (const k of ['guests', 'guestsTitle', 'seatGuests', 'liveGuests', 'overCapacity', 'saveGuests', 'back']) {
      expect((esCatalog as { ui: Record<string, string> }).ui[k], `es ${k}`).toBeTruthy();
      expect((enCatalog as { ui: Record<string, string> }).ui[k], `en ${k}`).toBeTruthy();
    }
  });
});

// tables#3 (c): the room settings are not a fake door — `prompt_guests_on_seat` is CONSUMED here.
// Lightspeed's "Cover count prompt" and Square's "Track seating" are toggles: a bar that never
// counts covers seats in one tap. Off → touching a free table opens the check with the table
// capacity straight away; the settings row comes from `tables.settings.get` (no row → default on).
describe('room settings: prompt_guests_on_seat (tables#3 c)', () => {
  const FREE6 = { id: 'tbl-6', number: '6', zone_id: 'z1', capacity: 6, status: 'available' };
  const tick = async (el: HTMLElement) => {
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    await new Promise((r) => setTimeout(r, 0));
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  };
  function stub(settings: Array<Record<string, unknown>>) {
    const calls: Array<{ name: string; payload?: Record<string, unknown> }> = [];
    (globalThis as Record<string, unknown>).erplora = {
      query: async (name: string) => {
        if (name === 'tables.settings.get') return settings;
        if (name.includes('zone')) return [ZONA];
        if (name === 'tables.sessions.list') return [];
        return [FREE6];
      },
      queryAll: async (name: string) => (name.includes('zone') ? [ZONA] : [FREE6]),
      command: async (name: string, payload?: Record<string, unknown>) => { calls.push({ name, payload }); return {}; },
      locale: 'es',
      t: (_c: unknown, key: string) => key,
    };
    return { calls };
  }

  it('off → a free table is seated at once with its capacity, no prompt', async () => {
    const { calls } = stub([{ id: 's', prompt_guests_on_seat: 0, timer_warning_minutes: 60, timer_critical_minutes: 90 }]);
    const el = await montar();
    el.shadowRoot.querySelector<HTMLElement>('ion-button.trigger')!.click();
    await tick(el);
    el.shadowRoot.querySelector<HTMLElement>('.mesa')!.click();
    await tick(el);
    expect(el.shadowRoot.querySelector('.guests'), 'no covers prompt when the setting is off').toBeNull();
    expect(calls.find((c) => c.name === 'tables.sessions.open')?.payload).toEqual({ table_id: 'tbl-6', guests_count: 6 });
  });

  it('no settings row → default ON: the prompt is shown', async () => {
    const { calls } = stub([]);
    const el = await montar();
    el.shadowRoot.querySelector<HTMLElement>('ion-button.trigger')!.click();
    await tick(el);
    el.shadowRoot.querySelector<HTMLElement>('.mesa')!.click();
    await tick(el);
    expect(el.shadowRoot.querySelector('.guests'), 'the prompt is the default').toBeTruthy();
    expect(calls.some((c) => c.name === 'tables.sessions.open')).toBe(false);
  });
});

// tables#16 / tables#11 — the POS table picker: 44px targets and Ionic controls.
// The table cell itself stays a native <button aria-pressed> (documented CANVAS EXCEPTION: a
// bordered, colour-coded tile with a pressed state that ion-button does not model), and so do the
// covers stepper (+/−, 3rem) and its quick chips (2.75rem grid). Everything else — the kebab ⋮ of
// an occupied table included — is an ion-button, and none is `size="small"`.
describe('touch targets and Ionic controls in the POS picker (tables#16, tables#11)', () => {
  const OCC = { id: 'tbl-1', number: '4', zone_id: 'z1', capacity: 4, status: 'occupied', live_guests: 3 };
  const tick = async (el: HTMLElement) => {
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    await new Promise((r) => setTimeout(r, 0));
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  };

  it('no ion-button is size="small"; the kebab is an ion-button; the only native buttons are the documented exceptions', async () => {
    (globalThis as Record<string, unknown>).erplora = {
      query: async (name: string) => (name.includes('zone') ? [ZONA] : name === 'tables.sessions.list' ? [{ id: 'ses-1', table_id: 'tbl-1', status: 'active' }] : [OCC]),
      queryAll: async (name: string) => (name.includes('zone') ? [ZONA] : [OCC]),
      command: async () => ({}),
      locale: 'es',
      t: (_c: unknown, key: string) => key,
    };
    const el = await montar();
    el.shadowRoot.querySelector<HTMLElement>('ion-button.trigger')!.click();
    await tick(el);
    expect(el.shadowRoot.querySelectorAll('ion-button[size="small"]').length, 'size="small" (~27 px) targets').toBe(0);
    const kebab = el.shadowRoot.querySelector('.kebab');
    expect(kebab?.tagName.toLowerCase(), 'the kebab ⋮ is Ionic').toBe('ion-button');
    expect(kebab?.getAttribute('aria-label')).toBe('ui.tableActions');
    const natives = [...el.shadowRoot.querySelectorAll('button')].map((b) => b.className.split(' ')[0] || b.parentElement?.className || '');
    for (const n of natives) expect(['mesa', 'minus', 'plus', 'quick'].some((ok) => n.startsWith(ok)), `native <button> «${n}» is not a documented exception`).toBe(true);
  });

  it('the touch-target rule is in the component styles: ion-button min-height 44px', async () => {
    const el = await montar();
    const cssText = ((el.constructor as unknown as { styles: { cssText: string } }).styles).cssText;
    expect(cssText).toMatch(/ion-button\s*\{[^}]*min-height:\s*44px/);
  });
});
