// pm#637 (TABLES-F31) — the name a reserved table shows.
//
// `customer.anonymized` empties the name a hold copied from its reservation but keeps the
// customer's id, so the table stays reserved and still says for whom: an erased customer. A hold
// with neither a name nor an id (one made by hand without a name) shows nothing, as before.

export interface HoldWho {
  reserved_for?: string | null;
  reserved_customer_id?: string | null;
}

/** The name to paint for the hold of `row`; `erasedLabel` is the translated «Deleted customer». */
export function holdName(row: HoldWho, erasedLabel: string): string {
  const name = (row.reserved_for ?? '').trim();
  if (name) return name;
  return row.reserved_customer_id ? erasedLabel : '';
}
