// tables#182 (born as sales#182) — NATURAL order for table labels.
//
// A room named S1…S12 used to come out of a plain text sort as `S1 · S10 · S11 · S12 · S2 …`, so a
// waiter looking for table 2 found it in the fifth slot, behind 10, 11 and 12. Square, Toast and
// Lightspeed all order their table selector naturally; that grid has exactly one job, which is
// finding a number in under a second.
//
// The criterion is decided PER ROW, not per room: a label ending in digits compares its numeric
// tail as a number, anything else stays alphabetical. That is precisely what
// `Intl.Collator(locale, { numeric: true })` does — the platform standard, so no hand-rolled
// tokenizer, and accents/case follow the active language instead of code points.
//
// The same rule is what `queries/tables_list.sql` implements server side (`number_sort`), so the
// POS picker, the floor plan and the paginated Tables list all agree on one order. Both sides
// cannot be ONE piece of code — the paginated list has to order in SQL, or each page would be
// sorted on its own and the pages would be cut by the wrong key — so what keeps them from drifting
// is `tests/natural-order-corpus.json`, read by `natural-order.test.ts` here and by
// `tests/floor.postgres.test.py` against a real Postgres.
//
// tables#68: they HAD drifted. The rule is "every run of digits compares as a number", and the SQL
// only padded the run at the END of the label, so `Barra 2 Bis` sorted before `Barra 10 Bis` in the
// picker and after it in the list. `naturalKey` below is the rule written down once, in the shape
// SQL can also express: left-pad every run of digits, then compare as text in the active locale.

/** Width every run of digits is padded to. Twelve holds any table number a room will ever have,
 *  and a longer run is left as it is rather than truncated — truncating would make two different
 *  labels compare equal. */
const PAD_WIDTH = 12;

/** The label rewritten so plain text comparison orders its numbers as numbers.
 *  `Barra 2 Bis` → `Barra 000000000002 Bis`. Mirrors `number_sort` in `queries/tables_list.sql`. */
export function naturalKey(label: string | null | undefined): string {
  return (label ?? '').replace(/[0-9]+/g, (run) => run.padStart(PAD_WIDTH, '0'));
}

const COLLATORS = new Map<string, Intl.Collator>();

/** Collator for `locale`, cached. An unparseable tag (`''` before the shell resolves the language,
 *  or a `xx_YY` typed with an underscore) makes `Intl` throw RangeError — fall back to the
 *  runtime default rather than take the screen down. */
function collator(locale?: string): Intl.Collator {
  const key = locale ?? '';
  const cached = COLLATORS.get(key);
  if (cached) return cached;
  let made: Intl.Collator;
  try {
    made = new Intl.Collator(locale || undefined, { numeric: true, sensitivity: 'variant' });
  } catch {
    made = new Intl.Collator(undefined, { numeric: true, sensitivity: 'variant' });
  }
  COLLATORS.set(key, made);
  return made;
}

/** Compares two table labels naturally (`S2` before `S10`, `Barra 2 Bis` before `Barra 10 Bis`,
 *  `Terraza A` before `Terraza B`). Missing labels sort first instead of throwing.
 *
 *  The comparison runs on `naturalKey`, not on the raw label: the collator alone already reads
 *  every digit run as a number, but the SQL side can only reproduce that through the padded key,
 *  and the whole point of tables#68 is that the two sides run the SAME rule. Accents and case still
 *  follow the active language, which is what the collator is here for. */
export function compareNatural(a: string | null | undefined, b: string | null | undefined, locale?: string): number {
  return collator(locale).compare(naturalKey(a), naturalKey(b));
}

/** A NEW array ordered naturally by the picked field. The input is never mutated: the callers hold
 *  the rows in Lit `@state()`, and sorting in place would mutate state behind Lit's back. */
export function sortNaturallyBy<T>(rows: readonly T[], pick: (row: T) => string | null | undefined, locale?: string): T[] {
  return [...rows].sort((a, b) => compareNatural(pick(a), pick(b), locale));
}
