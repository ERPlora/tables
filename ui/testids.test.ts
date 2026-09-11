// Un control que el robot de QA no sabe nombrar es un control que no prueba nadie (tables#86).
//
// El QA del hub conduce la pantalla con Playwright, y Playwright direcciona por `data-testid`: es
// el único gancho que sobrevive a un cambio de copy, a la traducción `en`↔`es` (ADR-0055 traduce
// TODO lo visible) y al Shadow DOM de un Web Component. Sin él un spec cae en selectores por texto
// o por `nth`, y así es como el recorrido de restaurante del 2026-09-09 dejó 9 puntos de este
// módulo sin verificar.
//
// Esta es la guardia del PATRÓN, espejo de `apps/web/src/form-testids.test.ts` del hub sobre el
// `ui/` de este repo. Cubre cinco cosas distintas y por eso son reglas distintas, no una:
//
//   · COBERTURA — en una superficie registrada, ningún control de formulario se queda sin gancho,
//     y ninguna `<ok-data-table>` se queda sin su `testid`. Es lo que hace que el campo que
//     alguien añada el mes que viene nazca ya direccionable.
//   · CONTRATO — los nombres que el QA escribe en sus specs están declarados aquí, y el conjunto
//     declarado es EXACTAMENTE el que hay en el fichero. Un `data-testid` es un contrato con quien
//     lo usa desde fuera: renombrarlo en silencio rompe la suite de QA en OTRO repo, así que
//     renombrarlo tiene que romper ESTE test primero, aquí, donde se ve.
//   · ATRIBUTO — `getByTestId` resuelve `data-testid` y nada más. Un `data-test` es un gancho que
//     el robot no alcanza, y el spec que lo lee afirma sobre la nada para siempre.
//   · ORTOGRAFÍA — el módulo escribe UNA forma de cada gancho. Las reglas de arriba leen esa
//     forma; cualquier otra manera de escribir el MISMO atributo es un gancho que Lit pinta, que
//     el QA direcciona y que este fichero no ve nunca.
//   · TRINQUETE — toda superficie con controles está clasificada: o cubierta, o pendiente con su
//     issue REAL. Un componente nuevo con un `ion-input` no puede colarse sin decidirlo.
//
// La convención es la del hub (`architecture/hub/apps/testids.md`): `<superficie>-<campo|acción|
// estado>`, kebab-case, prefijo de pantalla obligatorio, y las filas de una lista con su identidad
// al final (`tables-pos-table-<id>`), nunca por índice.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * La raíz de `ui/`, que es este mismo directorio. `import.meta.dirname` y no `import.meta.url`:
 * bajo `happy-dom` la URL del módulo no es `file:` y `fileURLToPath` muere antes de recoger un solo
 * test — el mismo camino que ya usan las guardias de `sales` y `flows`.
 */
const UI = import.meta.dirname;

/**
 * Superficie cubierta: `prefix` es el espacio de nombres que le pertenece, `contract` el conjunto
 * EXACTO de ganchos literales que el fichero declara hoy, y `computed` ese mismo contrato para los
 * que Lit construye al pintar (`data-testid=${...}`), declarados por su CABEZA FIJA — la parte que
 * el QA puede predecir, con la identidad de la fila detrás.
 *
 * Para entrar aquí un componente necesita las dos mitades: todo control con gancho (regla de
 * cobertura) y su contrato escrito (regla de contrato). Añadir un campo obliga a tocar esta lista
 * — a propósito: es el momento en el que alguien decide cómo se va a llamar ese campo para el
 * resto del mundo.
 *
 * El prefijo lleva SIEMPRE el id del módulo (`tables-`) porque estos ganchos no viven solos: el
 * shell monta varios módulos en la misma página (el selector de mesa del TPV se proyecta dentro de
 * la pantalla de ventas), así que un `zones-table` de este repo y otro de un módulo vecino serían
 * dos elementos para el mismo `getByTestId`.
 */
const COVERED: Record<string, { prefix: string; contract: string[]; computed?: string[] }> = {
  // El plano de sala (`/m/tables/floor_plan`): el lienzo con las mesas, la barra de zonas y las
  // tres hojas de configuración (alta, editar mesa, editar zona). Es la pantalla que la issue
  // nombra y la única del módulo donde se crea una mesa con dos toques.
  'components/erp-tables-canvas/erp-tables-canvas.ts': {
    prefix: 'tables-floor-',
    contract: [
      'tables-floor-add',
      'tables-floor-add-close',
      'tables-floor-add-sheet',
      'tables-floor-empty-tables',
      'tables-floor-empty-zones',
      'tables-floor-error',
      'tables-floor-loading',
      'tables-floor-new-table-number',
      'tables-floor-new-table-submit',
      'tables-floor-new-zone-name',
      'tables-floor-new-zone-submit',
      'tables-floor-table-capacity',
      'tables-floor-table-close',
      'tables-floor-table-delete',
      'tables-floor-table-name',
      'tables-floor-table-number',
      'tables-floor-table-save',
      'tables-floor-table-sheet',
      'tables-floor-table-shape',
      'tables-floor-table-status',
      'tables-floor-table-zone',
      'tables-floor-zone-close',
      'tables-floor-zone-delete',
      'tables-floor-zone-description',
      'tables-floor-zone-edit',
      'tables-floor-zone-name',
      'tables-floor-zone-save',
      'tables-floor-zone-sheet',
      'tables-floor-zones',
    ],
    computed: [
      'tables-floor-tile-',
      'tables-floor-zone-tab-',
    ],
  },
  // El listado de mesas de back-office (`/m/tables/tables`): la tabla y el alta que vive detrás
  // del «+». El cromo de la tabla (añadir, buscador, acciones de fila, paginador) lo pinta
  // `<ok-data-table>` y lo deriva ella de `testid` (outfitkit#143): desde aquí solo se le pasa.
  'components/erp-tables-floor-plan/erp-tables-floor-plan.ts': {
    prefix: 'tables-list-',
    contract: [
      'tables-list-capacity',
      'tables-list-error',
      'tables-list-form',
      'tables-list-load-error',
      'tables-list-number',
      'tables-list-submit',
      'tables-list-table',
      'tables-list-zone',
    ],
  },
  // El selector de mesa del TPV: se proyecta en la ranura `sales.pos.assign`, o sea DENTRO de la
  // pantalla de ventas de otro módulo. Es la superficie más cara de dejar sin conducir, porque por
  // aquí pasan sentar, transferir, unir, dividir y comensales — la cadena entera del servicio.
  'components/erp-tables-pos-zones/erp-tables-pos-zones.ts': {
    prefix: 'tables-pos-',
    contract: [
      'tables-pos-cancel',
      'tables-pos-close',
      'tables-pos-empty',
      'tables-pos-error',
      'tables-pos-guests',
      'tables-pos-guests-back',
      'tables-pos-guests-confirm',
      'tables-pos-guests-minus',
      'tables-pos-guests-over',
      'tables-pos-guests-plus',
      'tables-pos-guests-prompt',
      'tables-pos-guests-value',
      'tables-pos-hint',
      'tables-pos-loading',
      'tables-pos-merge',
      'tables-pos-remove',
      'tables-pos-sheet',
      'tables-pos-split',
      'tables-pos-transfer',
      'tables-pos-trigger',
      'tables-pos-zones',
    ],
    computed: [
      'tables-pos-actions-',
      'tables-pos-guests-quick-',
      'tables-pos-table-',
      'tables-pos-zone-tab-',
    ],
  },
  // El historial de sesiones (`/m/tables/sessions`): los segmentos activas/hoy/todas, la tabla, la
  // ficha de una sesión y el cierre con su confirmación.
  'components/erp-tables-sessions/erp-tables-sessions.ts': {
    prefix: 'tables-sessions-',
    contract: [
      'tables-sessions-close-cancel',
      'tables-sessions-close-confirm',
      'tables-sessions-close-modal',
      'tables-sessions-detail',
      'tables-sessions-detail-close',
      'tables-sessions-detail-close-session',
      'tables-sessions-error',
      'tables-sessions-load-error',
      'tables-sessions-table',
      'tables-sessions-tabs',
    ],
    computed: ['tables-sessions-tab-'],
  },
  // Las zonas (`/m/tables/zones`): la tabla, el alta/edición detrás del «+» y el borrado con su
  // confirmación.
  'components/erp-tables-zones/erp-tables-zones.ts': {
    prefix: 'tables-zones-',
    contract: [
      'tables-zones-active',
      'tables-zones-cancel',
      'tables-zones-color',
      'tables-zones-delete-cancel',
      'tables-zones-delete-confirm',
      'tables-zones-delete-modal',
      'tables-zones-error',
      'tables-zones-form',
      'tables-zones-load-error',
      'tables-zones-name',
      'tables-zones-order',
      'tables-zones-submit',
      'tables-zones-table',
    ],
  },
};

/**
 * Superficies con controles que todavía no llevan ganchos, cada una con la issue que lo pide.
 *
 * La lista solo puede ENCOGER: cuando una se completa sale de aquí y entra arriba (la regla de
 * «pendiente ya completa» falla si se queda). Un componente nuevo no nace en esta lista — nace
 * cubierto.
 */
const NOT_YET_COVERED: Record<string, string> = {
};

/**
 * Cuántas superficies hay en la lista de pendientes HOY. Este número SOLO BAJA: cuando una pasa a
 * `COVERED` se resta uno, y nunca se suma. Sin él la lista de pendientes sería una lista de
 * excepciones — un componente nuevo entraría ahí con una issue de adorno y la guardia seguiría en
 * verde.
 */
const PENDING_TODAY = 0;

/** Lo que una persona rellena. Los botones y los estados se declaran en el contrato. */
const CONTROL_TAGS = [
  'ion-input',
  'ion-select',
  'ion-textarea',
  'ion-toggle',
  'ion-checkbox',
  'ion-searchbar',
  'ion-radio-group',
  'ion-datetime',
  'ion-range',
  // El hub no lo lista y aquí sí: la navegación de este módulo SON segmentos (las zonas del plano,
  // las zonas del TPV, los estados de las sesiones). Un spec que no puede cambiar de zona no llega
  // a ninguna mesa, así que un `ion-segment` nuevo sin gancho tiene que romper esto.
  'ion-segment',
  'input',
  'select',
  'textarea',
  // El hub deja los botones fuera («se declaran en el contrato») y aquí NO se puede: medido con el
  // mutante «añado un control sin gancho» sobre un `<ion-button>` de acción, que sobrevivía con la
  // guardia entera en verde. Una ACCIÓN sin gancho es un spec que no puede pulsar nada, igual que
  // un campo sin gancho es un spec que no puede escribir: las dos rompen esto. Lo mismo el `<form>`
  // en sí, que es lo que un spec envía.
  'ion-button',
  'button',
  'form',
] as const;

const CONTROL_OPEN = new RegExp(`<(${CONTROL_TAGS.join('|')})(?=[\\s/>])`, 'g');

/** `<ok-data-table>`: sin `testid` no pinta NINGUNO de sus ganchos derivados (outfitkit#143). */
const DATA_TABLE_OPEN = /<ok-data-table(?=[\s/>])/g;

/**
 * Gancho literal, escrito a mano. Dos formas, y las dos cuentan igual para el contrato:
 *   · `data-testid="x"` — el gancho de un control de este módulo.
 *   · `testid="x"`      — el prefijo que `<ok-data-table>` expande a su cromo. Es el mismo
 *                         contrato con el QA: si se renombra, el spec que pulsa «Añadir» se queda
 *                         sin nada que pulsar, aunque el atributo se llame distinto.
 * El lookbehind es lo que impide que `data-testid` se cuente además como un `testid` suelto, y
 * excluye `:` a propósito: `:data-testid="x"` NO es un binding en Lit —pinta un atributo que
 * se llama literalmente `:data-testid`, que `getByTestId` no resuelve—, así que leerlo como
 * literal declararía en el contrato un nombre que no existe en la pantalla.
 */
const LITERAL_TESTID = /(?<![:\w-])(?:data-)?testid="([^"]*)"/g;

/**
 * Cómo se ESCRIBE un gancho. Las reglas de arriba leen exactamente tres formas —
 * `data-testid="…"`, `data-testid=${…}` y `testid="…"`—, así que cualquier otra manera de escribir
 * el MISMO atributo es un gancho que Lit pinta y que este fichero no ve. Lit acepta varias
 * (`data-testid="${…}"` entrecomillado, `.dataTestid=${…}` como propiedad, comillas simples), y la
 * sintaxis de Vue (`:data-testid`, `v-bind:data-testid`) se cuela sola cuando alguien copia una
 * pantalla del shell. Enseñar tres ortografías a cuatro expresiones regulares serían cuatro sitios
 * donde olvidar una: el módulo escribe UNA forma y esta regla lo dice.
 */
const TESTID_SPELLING = /(?<![\w-])([.?@]|v-bind:|:)?((?:data-)?testid)\s*=\s*(\$\{|"|'|[^\s>])/g;

/**
 * Cualquier atributo `data-test…`, para distinguir el gancho de las variantes que lo parecen y no
 * lo son. Playwright resuelve `getByTestId` contra `data-testid` y nada más, así que un
 * `data-test="x"` es un gancho que el robot no alcanza — y el spec que lo lee afirma sobre la nada
 * para siempre.
 */
const TEST_ATTR = /(?<![\w-])(data-test[\w-]*)\s*=\s*("[^"]*"|'[^']*'|\$\{)?/g;

/** Kebab-case: minúsculas y dígitos separados por un solo guión. */
const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/** Fin de una cadena JS abierta en `from` con la comilla `quote`. */
function endOfString(src: string, from: number, quote: string): number {
  for (let i = from; i < src.length; i++) {
    if (src[i] === '\\') { i++; continue; }
    if (src[i] === quote) return i;
  }
  return src.length;
}

/**
 * Fin de una expresión `${…}` abierta en `from` (justo tras el `{`).
 *
 * No vale contar llaves a secas: una expresión de Lit lleva dentro objetos, cadenas y otras
 * plantillas anidadas (`style=${`left:${x}px`}`), así que hay que saltarse cada una entera o el
 * primer `}` de la plantilla interior cerraría la exterior.
 */
function endOfExpression(src: string, from: number): number {
  let depth = 0;
  let i = from;
  while (i < src.length) {
    const c = src[i];
    if (c === '\\') { i += 2; continue; }
    if (c === '`') { i = endOfTemplate(src, i + 1) + 1; continue; }
    if (c === '"' || c === "'") { i = endOfString(src, i + 1, c) + 1; continue; }
    if (c === '{') { depth++; i++; continue; }
    if (c === '}') { if (depth === 0) return i; depth--; i++; continue; }
    i++;
  }
  return src.length;
}

/** Fin de una plantilla literal abierta en `from` (justo tras la comilla invertida). */
function endOfTemplate(src: string, from: number): number {
  let i = from;
  while (i < src.length) {
    const c = src[i];
    if (c === '\\') { i += 2; continue; }
    if (c === '`') return i;
    if (c === '$' && src[i + 1] === '{') { i = endOfExpression(src, i + 2) + 1; continue; }
    i++;
  }
  return src.length;
}

/**
 * El MARKUP del fichero: una copia del mismo tamaño donde solo sobrevive lo que vive dentro de una
 * plantilla `html`…``, y el resto son espacios.
 *
 * Un componente Lit no tiene bloque `<template>` como una `.vue`: su markup son plantillas
 * etiquetadas repartidas por toda la clase. Barrer el fichero entero contaría como control
 * cualquier `<input>` que apareciera en un comentario o en una cadena de TypeScript; barrer solo
 * las plantillas de primer nivel (las anidadas viajan DENTRO de la suya, sin contarse dos veces)
 * mira exactamente lo que se pinta. Se conservan las posiciones y los saltos de línea para que el
 * número de línea del informe sea el del fichero real.
 */
function markupOf(source: string): string {
  const out = [...source].map((c) => (c === '\n' ? '\n' : ' '));
  const OPEN = /\bhtml`/g;
  let i = 0;
  while (i < source.length) {
    OPEN.lastIndex = i;
    const m = OPEN.exec(source);
    if (!m) break;
    const start = m.index + m[0].length;
    const end = endOfTemplate(source, start);
    for (let k = start; k < end; k++) out[k] = source[k];
    i = end + 1;
  }
  return out.join('');
}

/**
 * El `>` que cierra la etiqueta de apertura.
 *
 * Se salta lo entrecomillado y —esto es lo propio de Lit— cada `${…}`: media etiqueta de este
 * módulo lleva un manejador con función flecha (`@ionInput=${(e) => …}`), y su `=>` trae un `>`
 * que cortaría la etiqueta por la mitad. Con la etiqueta cortada, un gancho escrito después del
 * manejador quedaría invisible y la regla de cobertura fallaría en verde.
 */
function openTag(src: string, start: number): string {
  let i = start;
  let quote: string | null = null;
  while (i < src.length) {
    const c = src[i];
    if (quote) { if (c === quote) quote = null; i++; continue; }
    if (c === '$' && src[i + 1] === '{') { i = endOfExpression(src, i + 2) + 1; continue; }
    if (c === '"' || c === "'") { quote = c; i++; continue; }
    if (c === '>') return src.slice(start, i + 1);
    i++;
  }
  return src.slice(start);
}

/** Ficheros de `ui/` que NO son tests: las superficies candidatas. */
function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, found);
    else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts')) found.push(full);
  }
  return found;
}

/** Todo `.ts` de `ui/`, tests incluidos: la otra mitad de la regla del atributo. */
function allFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) allFiles(full, found);
    else if (entry.endsWith('.ts')) found.push(full);
  }
  return found;
}

const SURFACES: Array<{ name: string; source: string; markup: string }> = sourceFiles(UI)
  .map((full) => {
    const source = readFileSync(full, 'utf8');
    return { name: relative(UI, full), source, markup: markupOf(source) };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

/**
 * Todo el módulo Y todos sus specs. La regla del atributo tiene que llegar a las dos mitades: un
 * componente que escribe `data-test` es un componente que el robot no direcciona, y un spec que
 * sigue leyendo `[data-test="…"]` después de que el componente dejara de escribirlo afirma
 * `null` para siempre — que es como una regla que no dispara se disfraza de regla que pasa.
 *
 * Este fichero es la única exclusión, y tiene que serlo: una guardia que prohíbe un atributo tiene
 * que deletrearlo para poder prohibirlo.
 */
const ALL_SOURCES: Array<{ name: string; source: string }> = allFiles(UI)
  .map((full) => ({ name: relative(UI, full), source: readFileSync(full, 'utf8') }))
  .filter(({ name }) => name !== 'testids.test.ts')
  .sort((a, b) => a.name.localeCompare(b.name));

/** Controles de formulario de una superficie, con el texto de su etiqueta de apertura. */
function controls(markup: string): Array<{ tag: string; line: number; open: string }> {
  const found: Array<{ tag: string; line: number; open: string }> = [];
  CONTROL_OPEN.lastIndex = 0;
  for (let m = CONTROL_OPEN.exec(markup); m; m = CONTROL_OPEN.exec(markup)) {
    found.push({
      tag: m[1],
      line: markup.slice(0, m.index).split('\n').length,
      open: openTag(markup, m.index),
    });
  }
  return found;
}

function dataTables(markup: string): Array<{ line: number; open: string }> {
  const found: Array<{ line: number; open: string }> = [];
  DATA_TABLE_OPEN.lastIndex = 0;
  for (let m = DATA_TABLE_OPEN.exec(markup); m; m = DATA_TABLE_OPEN.exec(markup)) {
    found.push({ line: markup.slice(0, m.index).split('\n').length, open: openTag(markup, m.index) });
  }
  return found;
}

/** Lleva gancho, sea literal (`data-testid="x"`) o calculado (`data-testid=${…}`). */
const hasTestid = (openTagText: string): boolean => /(?:^|\s)data-testid\s*=/.test(openTagText);

/** `<ok-data-table>` con su prefijo declarado. */
const hasTableTestid = (openTagText: string): boolean => /(?:^|\s)testid\s*=/.test(openTagText);

function literalTestids(markup: string): string[] {
  const found: string[] = [];
  LITERAL_TESTID.lastIndex = 0;
  for (let m = LITERAL_TESTID.exec(markup); m; m = LITERAL_TESTID.exec(markup)) found.push(m[1]);
  return found;
}

/** Las expresiones `data-testid=${…}` de una superficie, con la expresión entera. */
function computedTestids(markup: string): string[] {
  const found: string[] = [];
  const OPEN = /(?<![:\w-])data-testid=\$\{/g;
  for (let m = OPEN.exec(markup); m; m = OPEN.exec(markup)) {
    const end = endOfExpression(markup, m.index + m[0].length);
    found.push(markup.slice(m.index + m[0].length, end).trim());
    OPEN.lastIndex = end + 1;
  }
  return found;
}

/**
 * La cabeza fija de un gancho calculado: una plantilla `` `tables-pos-table-${tb.id}` `` → la
 * cadena `tables-pos-table-`.
 *
 * `null` significa que la expresión no deletrea ninguna cabeza predecible: o es una propiedad
 * suelta (`data-testid=${this.testid}` — el control reutilizable, cuyo nombre pone quien lo usa) o
 * es una plantilla que abre con la interpolación, que no puede direccionar nadie.
 */
function fixedPartOf(expression: string): string | null {
  const template = expression.match(/^`([^`]*)`$/);
  if (!template) return null;
  const head = template[1].split('${')[0];
  return head === '' ? null : head;
}

/** Las cabezas fijas que una superficie escribe hoy, sin repetir: toda fila comparte la suya. */
const fixedParts = (markup: string): string[] => [
  ...new Set(
    computedTestids(markup)
      .map(fixedPartOf)
      .filter((fixed): fixed is string => fixed !== null),
  ),
];

const uncoveredControls = (markup: string): string[] => [
  ...controls(markup)
    .filter((c) => !hasTestid(c.open))
    .map((c) => `<${c.tag}> línea ${c.line}`),
  ...dataTables(markup)
    .filter((d) => !hasTableTestid(d.open))
    .map((d) => `<ok-data-table> línea ${d.line} (sin testid: su cromo no pinta ningún gancho)`),
];

const surfaceOf = (name: string) => SURFACES.find((s) => s.name === name);

describe('data-testid — convención del módulo tables (tables#86)', () => {
  it('todo data-testid literal es kebab-case', () => {
    const offenders: string[] = [];
    for (const { name, markup } of SURFACES) {
      for (const value of literalTestids(markup)) {
        if (!KEBAB.test(value)) offenders.push(`${name}: "${value}"`);
      }
    }
    expect(offenders, 'un nombre que no es kebab-case rompe la predicción del QA').toEqual([]);
  });

  it('ningún data-testid literal se repite en dos superficies', () => {
    const owners = new Map<string, string[]>();
    for (const { name, markup } of SURFACES) {
      for (const value of new Set(literalTestids(markup))) {
        owners.set(value, [...(owners.get(value) ?? []), name]);
      }
    }
    const shared = [...owners]
      .filter(([, files]) => files.length > 1)
      .map(([value, files]) => `"${value}" en ${files.join(' + ')}`);
    expect(shared, 'getByTestId devolvería dos elementos y el spec elegiría al azar').toEqual([]);
  });

  it('las superficies cubiertas no dejan ningún control sin gancho', () => {
    const offenders: string[] = [];
    for (const name of Object.keys(COVERED)) {
      const surface = surfaceOf(name);
      expect(surface, `${name} está en COVERED pero no existe`).toBeDefined();
      for (const control of uncoveredControls(surface!.markup)) offenders.push(`${name}: ${control}`);
    }
    expect(offenders, 'un control sin data-testid no lo puede rellenar Playwright').toEqual([]);
  });

  it('el contrato literal declarado es EXACTAMENTE el que hay en la superficie', () => {
    const drift: string[] = [];
    for (const [name, spec] of Object.entries(COVERED)) {
      const found = [...new Set(literalTestids(surfaceOf(name)?.markup ?? ''))].sort();
      const declared = [...spec.contract].sort();
      for (const missing of declared.filter((v) => !found.includes(v))) {
        drift.push(`${name}: el contrato declara "${missing}" y la superficie ya no lo tiene`);
      }
      for (const extra of found.filter((v) => !declared.includes(v))) {
        drift.push(`${name}: la superficie tiene "${extra}" y el contrato no lo declara`);
      }
    }
    expect(drift, 'renombrar un data-testid rompe la suite de QA: decláralo aquí').toEqual([]);
  });

  it('la cabeza fija de todo gancho calculado es kebab-case', () => {
    const offenders: string[] = [];
    for (const { name, markup } of SURFACES) {
      for (const fixed of fixedParts(markup)) {
        if (!KEBAB.test(fixed.replace(/-$/, ''))) offenders.push(`${name}: "${fixed}"`);
      }
    }
    expect(offenders, 'una cabeza que no es kebab-case rompe lo que el QA predice').toEqual([]);
  });

  it('el contrato calculado declarado es EXACTAMENTE el que hay en la superficie', () => {
    const drift: string[] = [];
    for (const [name, spec] of Object.entries(COVERED)) {
      const found = fixedParts(surfaceOf(name)?.markup ?? '').sort();
      const declared = [...(spec.computed ?? [])].sort();
      for (const missing of declared.filter((v) => !found.includes(v))) {
        drift.push(`${name}: el contrato declara "${missing}…" y la superficie ya no lo tiene`);
      }
      for (const extra of found.filter((v) => !declared.includes(v))) {
        drift.push(`${name}: la superficie tiene "${extra}…" y el contrato no lo declara`);
      }
    }
    expect(drift, 'renombrar un gancho calculado rompe la suite de QA: decláralo aquí').toEqual([]);
  });

  it('cada gancho vive en el espacio de nombres de su superficie', () => {
    const offenders: string[] = [];
    for (const [name, spec] of Object.entries(COVERED)) {
      if (!spec.prefix) continue;
      const markup = surfaceOf(name)?.markup ?? '';
      for (const value of new Set(literalTestids(markup))) {
        if (!value.startsWith(spec.prefix)) offenders.push(`${name}: "${value}" ≠ ${spec.prefix}*`);
      }
      for (const fixed of fixedParts(markup)) {
        if (!fixed.startsWith(spec.prefix)) offenders.push(`${name}: "${fixed}…" ≠ ${spec.prefix}*`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('un gancho calculado sin cabeza fija solo cabe en un control reutilizable', () => {
    // Una superficie con espacio de nombres propio deletrea sus ganchos; `prefix: ''` es como este
    // registro marcaría el control que no lo tiene, porque el nombre se lo pone quien lo usa.
    const offenders: string[] = [];
    for (const [name, spec] of Object.entries(COVERED)) {
      if (!spec.prefix) continue;
      for (const expression of computedTestids(surfaceOf(name)?.markup ?? '')) {
        if (fixedPartOf(expression) === null) offenders.push(`${name}: data-testid=\${${expression}}`);
      }
    }
    expect(
      offenders,
      'el QA no puede predecir un nombre que la superficie no deletrea: dale una cabeza fija',
    ).toEqual([]);
  });

  it('nada del módulo escribe data-test: Playwright solo resuelve data-testid', () => {
    const offenders: string[] = [];
    for (const { name, source } of ALL_SOURCES) {
      TEST_ATTR.lastIndex = 0;
      for (let m = TEST_ATTR.exec(source); m; m = TEST_ATTR.exec(source)) {
        if (m[1] !== 'data-testid') offenders.push(`${name}: ${m[1]}=${m[2] ?? ''}`);
      }
    }
    expect(
      offenders,
      'getByTestId no lo resuelve: escribe data-testid, con el prefijo de su superficie',
    ).toEqual([]);
  });

  it('un gancho se escribe data-testid="…", data-testid=${…} o testid="…", y de ninguna otra forma', () => {
    const offenders: string[] = [];
    for (const { name, source } of SURFACES) {
      TESTID_SPELLING.lastIndex = 0;
      for (let m = TESTID_SPELLING.exec(source); m; m = TESTID_SPELLING.exec(source)) {
        const [, prefix, attr, open] = m;
        const ok = prefix === undefined
          && (attr === 'data-testid' ? open === '"' || open === '${' : open === '"');
        if (!ok) offenders.push(`${name}: ${prefix ?? ''}${attr}=${open}`);
      }
      for (const value of literalTestids(source)) {
        // `data-testid="${…}"` lo pinta Lit igual que sin comillas, pero la regla del contrato lo
        // leería como un nombre literal — y declararía el TEXTO de la expresión como si fuera un
        // gancho. Una forma sola, y esta no lo es.
        if (value.includes('${')) offenders.push(`${name}: data-testid="${value}" (entrecomillado)`);
      }
    }
    expect(
      offenders,
      'las reglas de arriba leen una ortografía: cualquier otra es un gancho sin contrato',
    ).toEqual([]);
  });

  it('toda superficie con controles está clasificada: cubierta o con su issue', () => {
    const unclassified = SURFACES.filter(
      ({ name, markup }) =>
        (controls(markup).length > 0 || dataTables(markup).length > 0)
        && !(name in COVERED)
        && !(name in NOT_YET_COVERED),
    ).map(({ name }) => name);
    expect(
      unclassified,
      'un componente nuevo nace con data-testid — o entra en NOT_YET_COVERED con su issue',
    ).toEqual([]);
  });

  it('una pendiente que ya está completa no se queda en la lista de pendientes', () => {
    const stale = Object.keys(NOT_YET_COVERED).filter((name) => {
      const surface = surfaceOf(name);
      return surface !== undefined && uncoveredControls(surface.markup).length === 0;
    });
    expect(stale, 'ya tiene todos los ganchos: pásala a COVERED con su contrato').toEqual([]);
  });

  it('la lista de pendientes solo encoge: una superficie nueva nace cubierta, no pendiente', () => {
    const pending = Object.keys(NOT_YET_COVERED).length;
    expect(
      pending,
      pending > PENDING_TODAY
        ? 'una superficie nueva no entra en NOT_YET_COVERED: ponle sus data-testid y pásala a COVERED'
        : `una pendiente salió de la lista: baja PENDING_TODAY a ${pending}`,
    ).toBe(PENDING_TODAY);
  });

  it('la lista de pendientes no nombra superficies que ya no existen', () => {
    const ghosts = Object.keys(NOT_YET_COVERED).filter((name) => surfaceOf(name) === undefined);
    expect(ghosts).toEqual([]);
  });

  it('cada pendiente cita una issue de verdad, no un hueco', () => {
    // Una pendiente sin issue es una pendiente que no hace nadie: el registro se lee como un plan,
    // y un `repo#PENDIENTE-algo` lo convierte en una lista de buenas intenciones que nunca entra en
    // el board. Forma exacta `repo#N` para que se pueda abrir desde aquí.
    const placeholders = Object.entries(NOT_YET_COVERED)
      .filter(([, issue]) => !/^[a-z][a-z0-9_-]*#\d+$/.test(issue))
      .map(([name, issue]) => `${name}: "${issue}"`);
    expect(placeholders, 'abre la issue y pon su número: el hueco no lo recoge el board').toEqual([]);
  });
});
