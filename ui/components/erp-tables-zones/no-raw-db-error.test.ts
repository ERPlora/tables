// tables#55 — lo que lee el hostelero cuando una guarda le dice que no es una FRASE, nunca sqlx.
//
// Borrar una zona con mesas contestaba con esto, tal cual, en un banner rojo sobre la tabla:
//
//     db: sqlx: error returned from database: new row for relation "tables__gate" violates
//     check constraint "tables__gate_ok_check" at line 2076
//
// La guarda funcionaba (la zona no se borraba), pero el mensaje era la violación de constraint de
// Postgres — y las TRES guardas del módulo daban el mismo texto, así que ni la persona ni el
// código que llama podían distinguir «esta zona tiene mesas» de «esa mesa tiene una cuenta
// abierta» de «esa mesa ya está ocupada» de un fallo real de base de datos.
//
// Que el runtime serialice el `Display` crudo de cualquier error es hub#1074 y no es de este
// módulo. Lo que sí es suyo es (a) tener un CÓDIGO por guarda —lo pone el handler, tables#55— y
// (b) lo que esta pantalla PINTA, que tiene que aguantar lo que sea que mande el servidor. Misma
// escalera que services#50, staff#1 y pricing#29:
//
//   1. un código que este módulo POSEE → su frase TRADUCIDA (`locales/<lang>.json → errors`);
//   2. otro código (uno del shell, `hub.elevation.*`) → conserva la frase del servidor, que es la
//      única descripción que existe y está escrita para una persona;
//   3. un mensaje con marcas del driver —o algo que ni siquiera es un Error— cae a la frase
//      genérica del módulo. Esa es la última red, y es la que hace que la regla valga también
//      para un fallo que TODAVÍA no tiene código de dominio.
//
// Y una cosa más, que no es de mensajes: si la pantalla YA SABE que la zona tiene mesas —lo dice
// en el propio diálogo, con el número— el botón rojo «Borrar zona» no se ofrece. Ofrecer una
// acción destructiva que se sabe de antemano que va a fallar es lo que corrigió tables#14 para la
// mesa bloqueada del TPV.
import { beforeEach, describe, expect, it } from 'vitest';

import esLocale from '../../../locales/es.json';

const RAW_SQLX =
  'db: sqlx: error returned from database: new row for relation "tables__gate" violates check constraint "tables__gate_ok_check" at line 2076';

const ZONES = [
  { id: 'z1', name: 'QA Zona', description: '', color: 'tertiary', sort_order: 1, is_active: 1, table_count: 8, available_tables_count: 8 },
  { id: 'z2', name: 'Vacía', description: '', color: 'primary', sort_order: 2, is_active: 1, table_count: 0, available_tables_count: 0 },
];

let failWith: unknown = null;

beforeEach(() => {
  failWith = null;
  (globalThis as Record<string, unknown>).erplora = {
    query: async () => [],
    queryAll: async () => [],
    queryPage: async () => ({ rows: ZONES, total: ZONES.length }),
    command: async () => {
      if (failWith) throw failWith;
      return {};
    },
    on: () => () => {},
    hasPermission: () => true,
    locale: 'es',
    t: (_catalog: unknown, key: string) => key,
  };
});

type Wc = HTMLElement & {
  shadowRoot: ShadowRoot;
  updateComplete: Promise<unknown>;
  deleteTarget: Record<string, unknown> | null;
  formError: string;
  confirmDelete: () => Promise<void>;
};

async function mount(): Promise<Wc> {
  await import('./erp-tables-zones');
  const el = document.createElement('erp-tables-zones') as Wc;
  document.body.appendChild(el);
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
  return el;
}

/** La forma que lanza el SDK: un `Error` que lleva el `code` estable del servidor. */
function serverError(code: string, message: string): Error {
  return Object.assign(new Error(message), { code });
}

async function deleteWith(error: unknown): Promise<string> {
  const wc = await mount();
  wc.deleteTarget = ZONES[0];
  failWith = error;
  await wc.confirmDelete();
  return wc.formError;
}

describe('la pantalla de zonas nunca enseña a la base de datos hablando', () => {
  it('el rechazo crudo de sqlx se queda en el mensaje genérico del módulo', async () => {
    const shown = await deleteWith(serverError('error', RAW_SQLX));
    expect(shown.toLowerCase()).not.toContain('sqlx');
    expect(shown.toLowerCase()).not.toContain('constraint');
    expect(shown.toLowerCase()).not.toContain('tables__gate');
    expect(shown, 'lo que queda es la frase genérica del módulo').toBe('ui.errDeleteZone');
  });

  it('el código de la guarda se pinta TRADUCIDO, no en el inglés del manifest', async () => {
    const shown = await deleteWith(
      serverError('tables.zone_has_tables', 'That zone still has tables. Move them or delete them first.'),
    );
    expect(shown).toBe(esLocale.errors['tables.zone_has_tables']);
  });

  it('las tres guardas tienen su propia frase, y ninguna se parece a las otras', () => {
    const codes = [
      'tables.zone_has_tables',
      'tables.table_has_active_session',
      'tables.table_not_available',
    ];
    const shown = codes.map((c) => esLocale.errors[c as keyof typeof esLocale.errors]);
    for (const [i, text] of shown.entries()) {
      expect(text, `${codes[i]} sin traducir`).toBeTruthy();
      expect(text.toLowerCase()).not.toContain('sqlx');
    }
    expect(new Set(shown).size, 'tres guardas, tres frases distintas').toBe(3);
  });

  it('un mensaje del driver bajo OTRO código se descarta igual', async () => {
    const shown = await deleteWith(serverError('hub.something_new', RAW_SQLX));
    expect(shown).toBe('ui.errDeleteZone');
  });

  it('un código del shell que el módulo no posee conserva su frase — está escrita para una persona', async () => {
    const shown = await deleteWith(
      serverError('hub.elevation.required', 'Un encargado tiene que aprobar esto antes de borrarlo.'),
    );
    expect(shown).toBe('Un encargado tiene que aprobar esto antes de borrarlo.');
  });

  it('algo que ni siquiera es un Error sigue dejando un mensaje', async () => {
    const shown = await deleteWith('boom');
    expect(shown).toBe('ui.errDeleteZone');
  });
});

describe('el diálogo no ofrece un borrado que ya sabe que va a fallar', () => {
  async function deleteButton(zone: Record<string, unknown>): Promise<HTMLElement> {
    const wc = await mount();
    wc.deleteTarget = zone;
    await wc.updateComplete;
    const buttons = [...wc.shadowRoot.querySelectorAll('ion-modal ion-button')] as HTMLElement[];
    const button = buttons.find((b) => b.getAttribute('color') === 'danger');
    expect(button, 'el diálogo pinta su botón de borrar').toBeTruthy();
    return button as HTMLElement;
  }

  it('«Borrar zona» está deshabilitado cuando la zona tiene mesas', async () => {
    const button = await deleteButton(ZONES[0]);
    expect(button.hasAttribute('disabled')).toBe(true);
  });

  it('y sigue disponible cuando la zona está vacía', async () => {
    const button = await deleteButton(ZONES[1]);
    expect(button.hasAttribute('disabled')).toBe(false);
  });
});
