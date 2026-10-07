// pm#637 (TABLES-F31) — the name a reserved table shows once its customer's data was erased.
//
// `customer.anonymized` empties the name the hold copied from the reservation but keeps the
// customer's id. A hold with an id and no name is an erased customer, read with the translated
// label the caller hands in; a hold with neither (a nameless hold made by hand) shows nothing,
// as before.
import { describe, expect, it } from 'vitest';
import { holdName } from './hold-name';

describe('holdName', () => {
  it('a hold with a name shows the name', () => {
    expect(holdName({ reserved_for: 'Ana', reserved_customer_id: 'c1' }, 'Deleted customer')).toBe('Ana');
  });

  it('an erased customer (id, no name) reads with the erased label', () => {
    expect(holdName({ reserved_for: '', reserved_customer_id: 'c1' }, 'Deleted customer')).toBe('Deleted customer');
  });

  it('blanks count as no name', () => {
    expect(holdName({ reserved_for: '  ', reserved_customer_id: 'c1' }, 'Deleted customer')).toBe('Deleted customer');
  });

  it('no name and no customer → nothing (not an erasure)', () => {
    expect(holdName({ reserved_for: '', reserved_customer_id: '' }, 'Deleted customer')).toBe('');
    expect(holdName({ reserved_for: null, reserved_customer_id: null }, 'Deleted customer')).toBe('');
    expect(holdName({}, 'Deleted customer')).toBe('');
  });
});
