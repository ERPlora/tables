// tables#66 — the one place this module asks "may this user do X?".
//
// The helper was copy-pasted into two components before a third needed it (the POS table picker,
// which is where transfer and merge live). Three copies of a permission check is three chances of
// one of them defaulting the wrong way: `can()` is deliberately PERMISSIVE when the shell exposes
// no `hasPermission` — an old shell must not blank out every button — and that mercy is only safe
// because the runtime re-validates on every command. A copy that quietly flipped to default-deny
// would empty the screens; one that forgot the fallback would crash them.
import { afterEach, describe, expect, it } from 'vitest';
import { can } from './permissions';

function withClient(client: unknown): void {
  (globalThis as Record<string, unknown>).erplora = client;
}

afterEach(() => {
  delete (globalThis as Record<string, unknown>).erplora;
});

describe('can', () => {
  it('answers what the shell answers', () => {
    withClient({ hasPermission: (p: string) => p === 'tables.view_table' });
    expect(can('tables.view_table')).toBe(true);
    expect(can('tables.transfer_tablesession')).toBe(false);
  });

  it('is permissive when the shell exposes no hasPermission (older shell)', () => {
    withClient({});
    expect(can('tables.transfer_tablesession')).toBe(true);
  });

  it('is permissive — never a thrown screen — when there is no shell at all', () => {
    withClient(undefined);
    expect(can('tables.transfer_tablesession')).toBe(true);
  });
});
