#!/usr/bin/env python3
"""Every gate of `tables__gate` refuses UNDER ITS OWN NAME (tables#76).

Runs against a REAL Postgres 18 in Docker, applying the module's `migrations/postgres/*.sql` the
way the runtime does.

THE DEFECT. `tables__gate` was created (`migrations/postgres/002_gate.sql`) with the anonymous
column check the pattern was copied with, `ok INTEGER NOT NULL CHECK (ok = 1)`. Postgres
auto-names it `tables__gate_ok_check`, so ALL NINE gates of this module refuse with the SAME
primary message and the name of the gate that actually refused travels in the separate DETAIL
field of the wire protocol:

    ERROR:   new row for relation "tables__gate" violates check constraint "tables__gate_ok_check"
    DETAIL:  Failing row contains (merge_applied, 0).

DETAIL never reaches the caller. A refusal arrives as `sqlx::Error::Database` wrapping
`PgDatabaseError`, whose `Display` writes the PRIMARY message and nothing else and whose
`message()` does not carry DETAIL. So the fallback road — the one taken when the WASM handler's
pre-check and the SQL gate disagree (a race between two POS, or any path that does not go through
the handler) — cannot say WHICH of the nine invariants aborted the transaction: not to the
operator, not to the log, not to the assistant.

WHY THE MESSAGE AND NOT THE ROW. `as_the_caller_sees_it()` below keeps ONLY the `ERROR:` line, so
this battery asserts on exactly the string the runtime hands over. A test that grepped psql's
whole stderr would find the gate name in DETAIL and prove nothing about the caller.

THE CONTRACT PINNED HERE (migration `011_named_gate_constraints.sql`):

  1. one named CHECK per gate, scoped to its own value, so for any row EXACTLY ONE can be
     violated and the primary message is deterministic — Postgres promises no evaluation order
     between constraints and this removes the need for it to;
  2. the anonymous catch-all is GONE, not kept as a belt: while both live, an `ok = 0` violates
     BOTH and either name may be the one reported;
  3. `tables__gate_is_declared` is what lets it go without opening a hole — with one constraint
     per gate, a row whose `gate` matches none of them violates NOTHING, so a typo in an assert
     would fail OPEN and the command would COMMIT. The whitelist refuses it instead: forgetting
     to register a new gate fails CLOSED and loudly;
  4. and the whitelist is checked against the gates the COMMANDS actually insert, so adding a
     tenth gate to an assert without registering it here is caught here and not in production.

Usage: tests/gate_constraints.postgres.test.py   (exit 0 = green)
  Uses the `erplora-test-pg-5433` container by default (override: TABLES_TEST_PG_CONTAINER, which
  is what `erplora test` derives from the manifest id and hands over in the gate).
  Creates a scratch database and DROPS it at the end, pass or fail.
"""

import importlib.util
import pathlib
import re
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location(
    "floor_harness", HERE / "floor.postgres.test.py"
)
harness = importlib.util.module_from_spec(_spec)
assert _spec.loader is not None
_spec.loader.exec_module(harness)

harness.DB = f"tables_gate_constraints_test_{harness.os.getpid()}"
DB = harness.DB
psql = harness.psql
q = harness.q
check = harness.check
failures = harness.failures
MODULE_DIR = harness.MODULE_DIR
MANIFEST = harness.MANIFEST

GATE_TABLE = "tables__gate"
WHITELIST = f"{GATE_TABLE}_is_declared"
ANONYMOUS = f"{GATE_TABLE}_ok_check"  # the name Postgres gives the column check of 002

# What the migrations published before this fix are, so the new one can be proven to be a NEW
# file and not an edit of one already applied on customers' hubs (module-toolkit#161).
PUBLISHED = (
    "001_init.sql",
    "002_gate.sql",
    "003_session_merge.sql",
    "004_session_order.sql",
    "005_session_assignment.sql",
    "006_session_no_table.sql",
    "007_session_history_fk.sql",
    "008_table_hold.sql",
    "009_session_split.sql",
    "010_settings.sql",
)

# `INSERT INTO tables__gate (gate, ok) SELECT '<name>', CASE WHEN …` — the shape every assert of
# this module uses. The gates are read from the COMMANDS, never from a list written here: a list
# copied by hand is exactly what drifts, and the drift is what fails OPEN.
ASSERT_GATE = re.compile(
    r"INSERT\s+INTO\s+" + GATE_TABLE + r"\s*\(\s*gate\s*,\s*ok\s*\)\s*SELECT\s+'([a-z0-9_]+)'",
    re.IGNORECASE,
)


def gates_the_commands_insert() -> list[str]:
    """Every gate name any `commands/*.sql` of this module writes into the guard table."""
    found: set[str] = set()
    for sql in sorted((MODULE_DIR / "commands").glob("*.sql")):
        found.update(ASSERT_GATE.findall(sql.read_text()))
    return sorted(found)


def as_the_caller_sees_it(pg_stderr: str) -> str:
    """What the RUNTIME hands the browser, which is much less than psql prints.

    Only the `ERROR:` line: `PgDatabaseError::Display` writes the primary message and nothing
    else, and `message()` drops DETAIL — where Postgres puts the failing row, and therefore the
    `gate` value."""
    for line in pg_stderr.splitlines():
        line = line.strip()
        if line.startswith("ERROR:"):
            return line[len("ERROR:") :].strip()
    return " ".join(pg_stderr.split())


def refusal_for(gate: str) -> str | None:
    """The primary message an `ok = 0` for `gate` produces, or None if the row was ACCEPTED."""
    try:
        psql([], db=DB, stdin=f"INSERT INTO {GATE_TABLE} (gate, ok) VALUES ('{gate}', 0);")
    except RuntimeError as exc:
        return as_the_caller_sees_it(str(exc))
    psql([], db=DB, stdin=f"DELETE FROM {GATE_TABLE};")
    return None


def constraint_defs() -> dict[str, str]:
    out = q(
        "SELECT string_agg(conname || '=' || pg_get_constraintdef(oid), E'\\n') "
        f"FROM pg_constraint WHERE conrelid = '{GATE_TABLE}'::regclass AND contype = 'c'"
    )
    defs: dict[str, str] = {}
    for line in out.splitlines():
        if "=" in line:
            name, _, body = line.partition("=")
            defs[name.strip()] = body.strip()
    return defs


def test_every_gate_refuses_under_its_own_name():
    print("\n== 1. every gate refuses under its OWN name, in the PRIMARY message (tables#76) ==")
    gates = gates_the_commands_insert()
    check("the commands declare the nine gates of the module", 9, len(gates))
    for gate in gates:
        seen = refusal_for(gate)
        if seen is None:
            failures.append(f"gate `{gate}` accepted ok = 0 — the invariant it guards is GONE")
            print(f"  FAIL: gate `{gate}` accepted ok = 0")
            continue
        check(f"`{gate}` — its own name reaches the caller", True, gate in seen)
        # The relation stays in the text: it is what the screens that were never taught a
        # specific gate still key on, so this must not silently break their mapping.
        check(f"`{gate}` — the guard table is still named", True, GATE_TABLE in seen)
        # The defect itself: a message that could be ANY of the nine is a message that says
        # nothing. Exactly one gate name may appear.
        others = [g for g in gates if g != gate and g in seen]
        check(f"`{gate}` — no OTHER gate is named in the same message", [], others)


def test_an_undeclared_gate_fails_closed():
    print("\n== 2. a gate nobody declared fails CLOSED (the whitelist) ==")
    seen = refusal_for("a_gate_nobody_declared")
    if seen is None:
        failures.append(
            "an undeclared gate was ACCEPTED — the guard table fails OPEN: a typo in an assert "
            "would let the command commit"
        )
        print("  FAIL: an undeclared gate was accepted")
        return
    check("the refusal names the whitelist", True, WHITELIST in seen)


def test_a_passing_gate_still_writes_its_row():
    print("\n== 3. the happy path is untouched: a gate that PASSES still inserts ==")
    gates = gates_the_commands_insert()
    for gate in gates:
        try:
            psql([], db=DB, stdin=f"INSERT INTO {GATE_TABLE} (gate, ok) VALUES ('{gate}', 1);")
        except RuntimeError as exc:
            # The other half of the whitelist. A gate the commands DO insert but the migration
            # never registered is refused even when it PASSES, so the command it guards can never
            # commit at all. Caught here as an assertion, not as a traceback: the run has to reach
            # the end and report every acceptance point.
            failures.append(
                f"gate `{gate}` is inserted by a command but the migration never registered it: "
                f"even ok = 1 is refused ({as_the_caller_sees_it(str(exc))})"
            )
            print(f"  FAIL: `{gate}` is refused even when it PASSES")
    check("every passing gate wrote its row", str(len(gates)), q(f"SELECT count(*) FROM {GATE_TABLE}"))
    # `_gate_clear.sql` is what drains it between commands; it must keep working.
    psql([], db=DB, stdin=(MODULE_DIR / "commands" / "_gate_clear.sql").read_text())
    check("`_gate_clear.sql` still drains it", "0", q(f"SELECT count(*) FROM {GATE_TABLE}"))


def test_the_anonymous_catch_all_is_gone_and_every_gate_has_its_own():
    print("\n== 4. the anonymous catch-all is GONE and every gate carries its own constraint ==")
    defs = constraint_defs()
    check(
        f"`{ANONYMOUS}` no longer exists (while both live, either name may be reported)",
        False,
        ANONYMOUS in defs,
    )
    for gate in gates_the_commands_insert():
        check(f"`{gate}` has a constraint of its own", True, gate in defs)
        body = defs.get(gate, "")
        check(f"`{gate}` — scoped to its own value", True, f"'{gate}'" in body)
        check(f"`{gate}` — and it is what still forbids ok <> 1", True, "ok = 1" in body.replace("(ok = 1)", "ok = 1"))


def test_the_whitelist_matches_the_gates_the_commands_use():
    print("\n== 5. the whitelist enumerates EXACTLY the gates the commands insert ==")
    defs = constraint_defs()
    body = defs.get(WHITELIST, "")
    check(f"`{WHITELIST}` exists", True, bool(body))
    declared = sorted(re.findall(r"'([a-z0-9_]+)'", body))
    check(
        "whitelist == gates the commands insert (a tenth gate must be registered in BOTH lists)",
        gates_the_commands_insert(),
        declared,
    )


def test_the_migration_is_declared_as_a_contract():
    print("\n== 6. the migration is a NEW file, declared, and marked `contract` for its DROP ==")
    files = sorted((MODULE_DIR / "migrations" / "postgres").glob("*.sql"))
    owning = [m.name for m in files if WHITELIST in m.read_text()]
    check("exactly one migration installs the named constraints", 1, len(owning))
    if not owning:
        return
    name = owning[0]
    check("it is a NEW file, not an edit of a published one", True, name not in PUBLISHED)
    check("it sorts after every published migration", True, name > max(PUBLISHED))

    declared = MANIFEST["migrations"]["postgres"]
    entry = next(
        (e for e in declared if isinstance(e, dict) and e.get("file", "").endswith(name)),
        None,
    )
    check("declared in module.json as an object entry", True, entry is not None)
    if entry is None:
        plain = f"migrations/postgres/{name}"
        check("...it is not declared as a plain string either", False, plain in declared)
        return
    # `contract` because of the DROP: a migration that removes a constraint is not additive, and
    # the manifest is where the hub reads that before applying it.
    check("declared `kind: contract` (it DROPs a constraint)", "contract", entry.get("kind"))
    check("...and carries the version it ships in", True, bool(entry.get("since")))

    text = (MODULE_DIR / "migrations" / "postgres" / name).read_text()
    code = "\n".join(l for l in text.splitlines() if not l.lstrip().startswith("--"))
    check(
        "no `;` hides inside a comment (it would split the SQL where nobody meant to)",
        0,
        sum(l.count(";") for l in text.splitlines() if l.lstrip().startswith("--")),
    )
    statements = [s.strip() for s in code.split(";") if s.strip()]
    # The swap is ATOMIC: the DROP and its replacements are in the SAME file, so there is no
    # window in which the table is unguarded.
    check(
        "the DROP and its replacements travel in the same file",
        True,
        any(re.search(r"DROP\s+CONSTRAINT", s, re.I) for s in statements)
        and sum(1 for s in statements if re.search(r"ADD\s+CONSTRAINT", s, re.I)) == 10,
    )
    check(
        "every statement is an ALTER TABLE on the guard table — nothing else is touched",
        True,
        all(re.match(rf"^ALTER TABLE {GATE_TABLE}\b", s, re.I) for s in statements),
    )


def main() -> int:
    running = subprocess.run(
        ["docker", "inspect", "-f", "{{.State.Running}}", harness.CONTAINER],
        capture_output=True,
        text=True,
    )
    if "true" not in running.stdout:
        subprocess.run(["docker", "start", harness.CONTAINER], capture_output=True)

    psql(["-c", f"DROP DATABASE IF EXISTS {DB} WITH (FORCE)"])
    psql(["-c", f"CREATE DATABASE {DB}"])
    try:
        for mig in sorted((MODULE_DIR / "migrations" / "postgres").glob("*.sql")):
            psql([], db=DB, stdin=mig.read_text())

        test_every_gate_refuses_under_its_own_name()
        test_an_undeclared_gate_fails_closed()
        test_a_passing_gate_still_writes_its_row()
        test_the_anonymous_catch_all_is_gone_and_every_gate_has_its_own()
        test_the_whitelist_matches_the_gates_the_commands_use()
        test_the_migration_is_declared_as_a_contract()
    finally:
        psql(["-c", f"DROP DATABASE IF EXISTS {DB} WITH (FORCE)"])

    print()
    if failures:
        print(f"FAILED — {len(failures)} assertion(s):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("PASS — every gate of `tables__gate` refuses under its own name (tables#76)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
