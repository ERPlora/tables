// Lo que lee el hostelero cuando el servidor le dice que no (tables#55).
//
// Las pantallas pintaban `e.message` tal cual, y así es como esto llegó a un banner rojo encima
// de la tabla de zonas:
//
//     db: sqlx: error returned from database: new row for relation "tables__gate" violates
//     check constraint "tables__gate_ok_check" at line 2076
//
// Nadie puede hacer nada con ese texto, y además publica el motor, su tabla guardia interna y un
// número de línea. Que el runtime serialice el `Display` crudo de cualquier error es hub#1074 y no
// es de este módulo; lo que este módulo PINTA sí lo es, y tiene que aguantar lo que sea que llegue.
//
// Tres peldaños, la misma escalera que ya subieron `services` (services#50), `staff` (staff#1) y
// `pricing` (pricing#29):
//
//   1. Un código que este módulo POSEE —los `expect_rows` de su manifest (tables#54) y los que
//      devuelven sus handlers WASM (tables#55)— se muestra como su frase TRADUCIDA. El código es
//      la ABI pública del módulo, así que su redacción vive con el módulo
//      (`locales/<lang>.json → errors`), inglés como fuente y español al lado (ADR-0055): el
//      inglés del manifest es el respaldo, no lo que la gente lee.
//   2. Cualquier otro código —uno del shell, como `hub.elevation.*`— conserva la frase del
//      servidor: es la única descripción que existe y está escrita para una persona.
//   3. Salvo que no lo esté. Un mensaje con marcas del driver se descarta por el texto genérico
//      del módulo. Esa es la última red, y es la que hace que la regla valga también para un
//      fallo que TODAVÍA no tiene código de dominio: el driver no llega a la pantalla.
import enLocale from '../../locales/en.json';
import esLocale from '../../locales/es.json';

const ERRORS: Record<string, Record<string, string>> = {
  es: (esLocale as { errors?: Record<string, string> }).errors ?? {},
  en: (enLocale as { errors?: Record<string, string> }).errors ?? {},
};

/** Marcas de un texto que viene de la fontanería y no es presentable a una persona. */
const INTERNALS = ['sqlx', 'db:', 'bind parameter', 'constraint', 'at line ', 'panicked', 'tables__gate'];

/** ¿Este texto se puede enseñar, o son las tripas del servidor? */
function presentable(text: string): boolean {
  const t = text.trim().toLowerCase();
  return t.length > 0 && !INTERNALS.some((mark) => t.includes(mark));
}

/** El código estable que trae el error del servidor, si trae alguno. */
export function errorCode(e: unknown): string | undefined {
  const code = typeof e === 'object' && e !== null ? (e as { code?: unknown }).code : undefined;
  return typeof code === 'string' ? code : undefined;
}

/**
 * El mensaje que hay que mostrar para `e`, en `lang`.
 *
 * @param e        lo que sea que atrapó el `catch` — un `Error` con el `code` del servidor, un
 *                 `Error` pelado, o cualquier cosa: un `catch` no garantiza ningún tipo.
 * @param lang     el idioma activo del hub (`erplora().locale`).
 * @param fallback la frase genérica del propio módulo, ya traducida. Nunca vacía.
 */
export function domainMessage(e: unknown, lang: string, fallback: string): string {
  const code = errorCode(e);
  if (code) {
    const translated = ERRORS[lang]?.[code] ?? ERRORS.en[code];
    if (translated) return translated;
  }
  const message = e instanceof Error ? e.message : '';
  return presentable(message) ? message : fallback;
}
