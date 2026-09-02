// tables#182 (from sales#182) — natural order for table labels.
//
// The POS table picker and the Tables list used to order by raw text, so a room named S1…S12 came
// out `S1 · S10 · S11 · S12 · S2 …` and the waiter found table 2 in the fifth slot. Square, Toast
// and Lightspeed all order their table selector naturally, and that grid has exactly one job:
// finding a number in under a second.
//
// The rule is decided PER ROW, not per table: a label that ends in digits compares its numeric
// suffix as a number; anything else falls back to alphabetical. `Intl.Collator(locale, { numeric:
// true })` is the standard that does exactly that, and it also keeps accents/case sane per locale.
import { describe, expect, it } from 'vitest';
import { compareNatural, naturalKey, sortNaturallyBy } from './natural-order';
import corpus from '../../tests/natural-order-corpus.json';

// tables#68 — the SAME corpus `tests/floor.postgres.test.py` runs against real Postgres. Two
// implementations of one rule drift silently, and they did: the SQL padded only the FINAL run of
// digits, so `Barra 2 Bis` came after `Barra 10 Bis` in the paginated list and before it in the POS
// picker. One file, two runners: whichever side moves turns red.
describe('the shared natural-order corpus', () => {
  for (const c of corpus.cases) {
    it(c.name, () => {
      expect([...c.shuffled].sort((a, b) => compareNatural(a, b, 'es'))).toEqual(c.expected);
    });
  }
});

describe('naturalKey', () => {
  it('pads EVERY run of digits, not just the last one', () => {
    expect(naturalKey('Barra 2 Bis')).toBe('Barra 000000000002 Bis');
    expect(naturalKey('Sala 2 Mesa 10')).toBe('Sala 000000000002 Mesa 000000000010');
  });

  it('leaves a label with no digits exactly as it is', () => {
    expect(naturalKey('Terraza A')).toBe('Terraza A');
  });

  it('never TRUNCATES a run longer than the padding width', () => {
    expect(naturalKey('M1234567890123')).toBe('M1234567890123');
  });

  it('is total on empty/missing labels', () => {
    expect(naturalKey('')).toBe('');
    expect(naturalKey(null)).toBe('');
    expect(naturalKey(undefined)).toBe('');
  });
});

describe('compareNatural', () => {
  it('orders a numbered room naturally: S1 < S2 < S9 < S10 < S12', () => {
    const shuffled = ['S10', 'S2', 'S12', 'S1', 'S9', 'S11', 'S3'];
    expect([...shuffled].sort((a, b) => compareNatural(a, b, 'es'))).toEqual(
      ['S1', 'S2', 'S3', 'S9', 'S10', 'S11', 'S12'],
    );
  });

  it('orders bare numbers as numbers, not as text', () => {
    expect(['10', '2', '1', '21', '3'].sort((a, b) => compareNatural(a, b, 'es'))).toEqual(
      ['1', '2', '3', '10', '21'],
    );
  });

  it('falls back to alphabetical when the label does not end in digits', () => {
    expect(['Terraza B', 'Terraza A', 'Barra'].sort((a, b) => compareNatural(a, b, 'es'))).toEqual(
      ['Barra', 'Terraza A', 'Terraza B'],
    );
  });

  it('mixes both criteria in one room — the criterion is per row', () => {
    const mixed = ['Terraza A', 'S10', 'Barra 2', 'S2', 'Barra 10', 'S1'];
    expect([...mixed].sort((a, b) => compareNatural(a, b, 'es'))).toEqual(
      ['Barra 2', 'Barra 10', 'S1', 'S2', 'S10', 'Terraza A'],
    );
  });

  it('is deterministic on empty/missing labels instead of throwing', () => {
    expect(['B', '', 'A'].sort((a, b) => compareNatural(a, b, 'es'))).toEqual(['', 'A', 'B']);
  });

  // `Intl.Collator` throws RangeError on a structurally invalid tag — and '' is one of them, which
  // is exactly what `erplora.locale` holds before the shell resolves the language.
  it('survives a locale the runtime cannot parse (never throws)', () => {
    expect(compareNatural('S1', 'S10', 'xx_YY')).toBeLessThan(0);
    expect(compareNatural('S1', 'S10', '')).toBeLessThan(0);
    expect(compareNatural('S1', 'S10', undefined)).toBeLessThan(0);
  });
});

describe('sortNaturallyBy', () => {
  it('returns a NEW array ordered by the picked field', () => {
    const rows = [{ number: 'S10' }, { number: 'S2' }, { number: 'S1' }];
    const out = sortNaturallyBy(rows, (r) => r.number, 'es');
    expect(out.map((r) => r.number)).toEqual(['S1', 'S2', 'S10']);
    expect(rows.map((r) => r.number), 'the input is not mutated').toEqual(['S10', 'S2', 'S1']);
  });

  it('keeps rows whose field is null/undefined without blowing up', () => {
    const rows = [{ number: 'S2' }, { number: null }, { number: 'S1' }];
    const out = sortNaturallyBy(rows as { number: string | null }[], (r) => r.number, 'es');
    expect(out.map((r) => r.number)).toEqual([null, 'S1', 'S2']);
  });
});
