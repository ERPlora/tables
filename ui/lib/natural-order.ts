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
// The same comparator is what `queries/tables_list.sql` implements server side (`number_sort`), so
// the POS picker, the floor plan and the paginated Tables list all agree on one order.

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

/** Compares two table labels naturally (`S2` before `S10`, `Terraza A` before `Terraza B`).
 *  Missing labels sort first instead of throwing. */
export function compareNatural(a: string | null | undefined, b: string | null | undefined, locale?: string): number {
  return collator(locale).compare(a ?? '', b ?? '');
}

/** A NEW array ordered naturally by the picked field. The input is never mutated: the callers hold
 *  the rows in Lit `@state()`, and sorting in place would mutate state behind Lit's back. */
export function sortNaturallyBy<T>(rows: readonly T[], pick: (row: T) => string | null | undefined, locale?: string): T[] {
  return [...rows].sort((a, b) => compareNatural(pick(a), pick(b), locale));
}
