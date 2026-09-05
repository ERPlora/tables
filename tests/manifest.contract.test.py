#!/usr/bin/env python3
"""Manifest contract test (tables#28) — `module.json` must parse the way the RUNTIME parses it.

Why this file exists: v2.2.10 shipped `"catch_up": false` where the contract declares a string
enum (`collapse` | `skip`, ADR-0011). `Manifest::load` is a plain
`serde_json::from_str::<Manifest>` and it is the FIRST thing `installer::install` does, so one
wrong JSON type did not degrade a feature — it closed the door: the published module could not be
installed on ANY hub. Nothing in this repo noticed, because `erplora validate` re-implements a
subset of the JSON Schema by hand instead of applying it.

Three layers, all in this one file, no services needed:

  1. TYPE CONTRACT (always, zero dependencies). Mirrors the serde model of
     `hub/crates/runtime/src/manifest.rs`: every block declared here must carry the JSON type the
     runtime deserializes it into. A boolean where a string enum belongs fails HERE, in the repo,
     before a release ever reaches a hub.

  2. CANONICAL JSON SCHEMA (when reachable). If `jsonschema` is importable and the hub checkout is
     at hand (`ERPLORA_MODULE_SCHEMA`, or the sibling checkout used by the dev workspace), the
     manifest is validated against `hub/schemas/module.schema.json` ITSELF — the source of truth,
     no re-implementation, no drift. Unreachable is reported as SKIPPED, never as a pass.
     ⚠️ The schema is read from the hub's `origin/develop` first, because that is where the current
     contract lives: a working tree parked on an older branch carries a PRE-hub#369 schema that
     rejects a manifest which is in fact correct. A schema that predates the contract is SKIPPED
     with the reason spelled out — a stale gate that passes is worse than no gate.

  3. DECLARED FILES EXIST. Every path the manifest points at (migrations, seed, query/command SQL,
     JSON Schemas, the WASM handler, the UI bundle) must be in the package. A manifest that points
     at a file the zip does not carry breaks on the hub, not here.

Usage: tests/manifest.contract.test.py   (exit 0 = green)
"""

import json
import os
import pathlib
import re
import subprocess
import sys

MODULE_DIR = pathlib.Path(__file__).resolve().parent.parent
MANIFEST_PATH = MODULE_DIR / "module.json"

# `enum CatchUp` in hub/crates/runtime/src/manifest.rs (`#[serde(rename_all = "lowercase")]`),
# mirrored by `$defs/scheduledTask.catch_up` in hub/schemas/module.schema.json. There is no
# "run every missed execution" mode on purpose: `collapse` (the default) runs the backlog ONCE,
# `skip` does not run it at all. A boolean is not a member of this enum.
CATCH_UP_VALUES = ("collapse", "skip")

# Dialects the runtime knows about (`struct Migrations`).
SQL_DIALECTS = ("sqlite", "postgres")

# ── The `setup` block (tables#24) ────────────────────────────────────────────────────────
#
# The slot the CORE reserved for `tables` in the onboarding checklist
# (`architecture/hub/setup-status.md` §6). The scale belongs to the core: a module takes the
# position it was assigned, it does not pick one. 100 is shared with `appointments` — the hub that
# is installed decides which of the two exists, and the key breaks the tie.
SETUP_ORDER = 100

# 🟡 recommended, not 🔴 functional: a bar can ring sales over the counter all day with an empty
# floor plan. The core's table puts slot 100 at 🟡, and the level is the core's call, not ours.
# It must still be written down: `required` defaults to true, so OMITTING it would silently claim
# 🔴 — and since hub#369 a 🟡 item is no longer dropped from the checklist, it is folded under
# "See all".
SETUP_REQUIRED = False

# Keys the `setup` block accepts (`struct SetupDef`, and `additionalProperties: false` in the
# canonical schema). `key` is deliberately NOT one of them: the core derives it as
# `<module_id>.setup` so that no manifest can rename itself out of the core-owned ⛔ list.
SETUP_KEYS = {
    "query",
    "params",
    "configured_when",
    "title",
    "description",
    "icon",
    "route",
    "permission",
    "countries",
    "order",
    "required",
}

# Properties `setup` only got in hub#369. A canonical schema without them predates the contract,
# and validating against it would fail a manifest that is correct (inventory#31 hit exactly this).
SETUP_CONTRACT_KEYS = ("order", "countries")

# Top-level blocks of the contract. The canonical schema declares `additionalProperties: false`;
# here an unknown key is only a warning, so that a manifest using a block newer than this list
# does not turn red for no reason (layer 2 is the strict one). Extend when the contract grows.
KNOWN_TOP_LEVEL = {
    "id",
    "name",
    "version",
    "description",
    "depends_on",
    "permissions",
    "role_permissions",
    "navigation",
    "migrations",
    "seed",
    "queries",
    "commands",
    "events",
    "agent",
    "ai_context",
    "scheduled_tasks",
    "widgets",
    "settings",
    "static_files",
    "provides_slots",
    "ui",
    "notify",
    "network",
    "capabilities",
    "setup",
    "errors",
}

# ADR-0398 — the value of every entry in `errors`. `{}` is the normal case; `deprecated` carries the
# version from which the code is announced as going away. Nothing else is part of the contract.
ERROR_ENTRY_KEYS = {"deprecated"}

# `errors::valid_domain_code` in the runtime: `<module>.<snake_case>`, 128 characters at most.
DOMAIN_CODE = re.compile(r"^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$")
DOMAIN_CODE_MAX = 128

JSON_TYPE_NAME = {
    bool: "boolean",
    int: "number",
    float: "number",
    str: "string",
    list: "array",
    dict: "object",
    type(None): "null",
}

failures: list[str] = []
warnings: list[str] = []
notes: list[str] = []


def type_name(value) -> str:
    return JSON_TYPE_NAME.get(type(value), type(value).__name__)


def expect(path: str, value, kind, enum: tuple | None = None) -> bool:
    """Assert the JSON type of `value`. `True`/`False` never pass as a number or a string:
    in Python `bool` is a subclass of `int`, in JSON it is a type of its own — and confusing
    the two is exactly the bug this file guards against."""
    ok = isinstance(value, kind) and not (isinstance(value, bool) and kind is not bool)
    if not ok:
        failures.append(
            f"{path}: expected {kind.__name__}, got {type_name(value)} ({value!r})"
        )
        return False
    if enum is not None and value not in enum:
        failures.append(f"{path}: {value!r} is not one of {list(enum)}")
        return False
    return True


def field(
    path: str,
    obj: dict,
    key: str,
    kind,
    required: bool = False,
    enum: tuple | None = None,
):
    """Check one key of an object. Absent (or `null`, which serde reads as `None` for an
    `Option<T>`) is fine unless the field is required."""
    if key not in obj or obj[key] is None:
        if required:
            failures.append(f"{path}.{key}: missing, and the runtime requires it")
        return None
    expect(f"{path}.{key}", obj[key], kind, enum)
    return obj[key]


def string_array(path: str, value) -> None:
    if not expect(path, value, list):
        return
    for i, item in enumerate(value):
        expect(f"{path}[{i}]", item, str)


# A migration entry admits TWO shapes (hub#542, `MigrationEntry` in the runtime and
# `$defs.migrationEntry` in the canonical schema): the bare path, which reads `expand` and is what
# the whole published catalogue uses, or `{ file, kind, since }` — the ONLY way to declare a
# `contract`, and therefore the only legitimate way to ship a `DROP` (the runtime turns it into a
# `RENAME … TO _deprecated_…` instead of destroying). `kind` and `since` are optional exactly like
# in the runtime. This test used to accept the string form alone, which put a manifest the core
# and the toolkit both accept in RED (tables#76, the migration that names the gate constraints).
MIGRATION_KINDS = ("expand", "backfill", "contract")


def migration_entry_array(path: str, value) -> None:
    if not expect(path, value, list):
        return
    for i, item in enumerate(value):
        where = f"{path}[{i}]"
        if isinstance(item, dict):
            field(where, item, "file", str, required=True)
            field(where, item, "kind", str, enum=MIGRATION_KINDS)
            field(where, item, "since", str)
            # `additionalProperties: false` in the canonical schema: a key it does not know about
            # is a typo that would be silently ignored, not an extension.
            for key in item:
                if key not in ("file", "kind", "since"):
                    failures.append(
                        f"{where}.{key}: not part of a migration entry — the canonical schema "
                        "declares `additionalProperties: false` (`file`, `kind`, `since`)"
                    )
            continue
        expect(where, item, str)


def migration_files(entries) -> list[str]:
    """The `.sql` paths an entry list points at, whichever shape each entry uses."""
    out: list[str] = []
    for item in entries if isinstance(entries, list) else []:
        if isinstance(item, str):
            out.append(item)
        elif isinstance(item, dict) and isinstance(item.get("file"), str):
            out.append(item["file"])
    return out


# ── Layer 1: the type contract, mirroring `struct Manifest` ──────────────────────────────


def check_identity(m: dict) -> None:
    field("", m, "id", str, required=True)
    field("", m, "name", str, required=True)
    field("", m, "version", str, required=True)
    field("", m, "description", str)

    # The marketplace resolves a module by its folder, so the two have to agree — but a git
    # worktree is checked out as `<id>-wt-<something>` (a worker) or `<id>-rv-<pr>` (a reviewer),
    # and comparing against that made this battery red on every worktree of the fleet, on a repo
    # nobody had touched. A red that fires on where the checkout lives, not on what the manifest
    # says, is a red people learn to skip.
    folder = re.sub(r"-(?:wt|rv)-[\w.-]+$", "", MODULE_DIR.name)
    if m.get("id") != folder:
        failures.append(
            f"id: {m.get('id')!r} does not match the module folder {MODULE_DIR.name!r}"
        )

    # The release bot bumps module.json and package.json together; a mismatch means a half-applied
    # release, and the marketplace publishes whatever module.json says.
    pkg_path = MODULE_DIR / "package.json"
    if pkg_path.exists():
        pkg_version = json.loads(pkg_path.read_text()).get("version")
        if pkg_version != m.get("version"):
            failures.append(
                f"version: module.json says {m.get('version')!r}, package.json says {pkg_version!r}"
            )


def check_permissions(m: dict) -> None:
    string_array("depends_on", m.get("depends_on", []))
    string_array("permissions", m.get("permissions", []))

    roles = m.get("role_permissions", {})
    if expect("role_permissions", roles, dict):
        for role, perms in roles.items():
            string_array(f"role_permissions.{role}", perms)


def check_navigation(m: dict) -> None:
    nav = m.get("navigation", [])
    if not expect("navigation", nav, list):
        return
    for i, entry in enumerate(nav):
        path = f"navigation[{i}]"
        if not expect(path, entry, dict):
            continue
        field(path, entry, "id", str, required=True)
        field(path, entry, "label", str, required=True)
        field(path, entry, "component", str, required=True)
        field(path, entry, "icon", str)
        for j, action in enumerate(entry.get("actions", [])):
            apath = f"{path}.actions[{j}]"
            if not expect(apath, action, dict):
                continue
            field(apath, action, "id", str, required=True)
            field(apath, action, "label", str, required=True)
            field(apath, action, "icon", str)
            field(apath, action, "permission", str)
            field(apath, action, "primary", bool)


def check_sql_blocks(m: dict) -> None:
    for block in ("migrations", "seed"):
        value = m.get(block, {})
        if not expect(block, value, dict):
            continue
        for dialect, files in value.items():
            if dialect not in SQL_DIALECTS:
                failures.append(f"{block}.{dialect}: unknown SQL dialect {dialect!r}")
                continue
            migration_entry_array(f"{block}.{dialect}", files)

    queries = m.get("queries", {})
    if expect("queries", queries, dict):
        for name, q in queries.items():
            path = f"queries.{name}"
            if not expect(path, q, dict):
                continue
            field(path, q, "permission", str, required=True)
            field(path, q, "sql", str, required=True)
            field(path, q, "schema", str)
            field(path, q, "expose_api", bool)
            if "list" in q and expect(f"{path}.list", q["list"], dict):
                spec = q["list"]
                string_array(f"{path}.list.search", spec.get("search", []))
                string_array(f"{path}.list.sort", spec.get("sort", []))
                field(f"{path}.list", spec, "default_sort", str)
                field(f"{path}.list", spec, "default_dir", str)
                field(f"{path}.list", spec, "page_size", int)

    commands = m.get("commands", {})
    if expect("commands", commands, dict):
        for name, c in commands.items():
            path = f"commands.{name}"
            if not expect(path, c, dict):
                continue
            field(path, c, "permission", str, required=True)
            field(path, c, "schema", str)
            field(path, c, "transaction", bool)
            field(path, c, "internal", bool)
            field(path, c, "expose_api", bool)
            field(path, c, "min_affected_rows", int)
            check_expect_rows(path, c)
            string_array(f"{path}.sql", c.get("sql", []))
            string_array(f"{path}.emit", c.get("emit", []))
            if "handler" in c and expect(f"{path}.handler", c["handler"], dict):
                h = c["handler"]
                field(f"{path}.handler", h, "type", str, required=True)
                field(f"{path}.handler", h, "file", str, required=True)
                field(f"{path}.handler", h, "function", str, required=True)


# ── The translatable affected-rows gate (`expect_rows`, hub#139 — tables#54) ─────────────
#
# It is the module's PUBLIC error ABI: a command that mutates nothing rolls back and answers this
# code instead of a `200 ok` with a phantom event. Two things can only be checked here:
#
#   * the namespace. The installer REJECTS a code outside `tables.` (`valid_domain_code`), so a
#     typo there does not degrade a message — it makes the module uninstallable on every hub.
#   * the translation. The code is what the UI keys on (ADR-0055); with no `errors` entry the
#     screen falls back to the manifest's English, and the Spanish user reads English.


def check_expect_rows(path: str, c: dict) -> None:
    gate = c.get("expect_rows")
    if gate is None:
        return
    if not expect(f"{path}.expect_rows", gate, dict):
        return
    field(f"{path}.expect_rows", gate, "op", str, required=True, enum=("min",))
    field(f"{path}.expect_rows", gate, "n", int, required=True)
    code = field(f"{path}.expect_rows", gate, "error", str, required=True)
    message = field(f"{path}.expect_rows", gate, "message", str)
    if c.get("min_affected_rows") is not None:
        failures.append(
            f"{path}: `expect_rows` and `min_affected_rows` cannot coexist — the installer refuses it"
        )
    if isinstance(code, str) and not code.startswith("tables."):
        failures.append(
            f"{path}.expect_rows.error: `{code}` is outside this module's namespace — "
            f"the installer rejects it and the module stops installing"
        )
    if isinstance(message, str) and len(message) > 500:
        failures.append(f"{path}.expect_rows.message: over the 500-character cap")


# The domain codes a Tier-2 handler mints (tables#55). They are the same public ABI as the
# `expect_rows` ones and need the same translation, but they are NOT in the manifest — the WASM
# guard lives in `handler/src/lib.rs` — so they are read from there.
#
# 🔴 The scan is LEXICAL over every `"tables.<snake_case>"` literal of the handler, not over the
# `reject(...)` call shape (interop-contract §8.2, ADR-0398). Pinning it to the helper made the
# check a mirror of ONE call site: a code minted through any other path — a constant, a `format!`,
# a second helper — read as "no code here" and shipped with neither catalogue entry nor Spanish.
# What the manifest already NAMES is excluded, because `<module>.<snake_case>` is equally the shape
# of a code, of a query and of a command: a handler reading its own data (`read_rows(&ctx,
# "tables.tables.get")`) or pushing an intention (`Operation::sql("tables._session_merge", …)`)
# is not emitting an error (module-toolkit#107).
HANDLER_LITERAL = re.compile(r'"(tables\.[a-z0-9_.]+)"')


def handler_codes(m: dict) -> set[str]:
    src = MODULE_DIR / "handler" / "src" / "lib.rs"
    if not src.exists():
        return set()
    names = set(m.get("commands") or {}) | set(m.get("queries") or {})
    return {
        code
        for code in HANDLER_LITERAL.findall(src.read_text())
        if code not in names and not code.split(".", 1)[1].startswith("_")
    }


def emitted_codes(m: dict) -> set[str]:
    """Every domain code this module can answer with: the declarative gate plus the handler."""
    return {
        c["expect_rows"]["error"]
        for c in (m.get("commands") or {}).values()
        if isinstance(c, dict)
        and isinstance(c.get("expect_rows"), dict)
        and isinstance(c["expect_rows"].get("error"), str)
    } | handler_codes(m)


def check_error_catalog(m: dict) -> None:
    """ADR-0398 — the codes are DECLARED surface (`module.json → errors`), not a side effect.

    Until this block existed a code was born in a literal of the handler or in an
    `expect_rows.error` and died where it was born: nothing published it, so nothing could notice
    it going away. `appointments` turned an `Err("overlap: …")` into a coded `DomainError` with its
    gate green and broke the pre-push gate of the whole fleet in under an hour, and hub#1070 lists
    18 tests of the hub asserting on the error TEXT because there was no code to assert on.

    With `errors` present the runtime is STRICT: an `Output.error` carrying a code that is not in
    the catalogue is a broken guest contract (`RuntimeError::Wasm`, `unexpected`), not a domain
    rejection the screen can translate. So the catalogue being one code short does not degrade a
    message — it turns a legitimate rejection into a 500. That is why the three lists
    (`expect_rows.error`, the handler's literals, and `locales/*.json → errors`) are compared
    against each other here and not merely against the manifest.
    """
    emitted = emitted_codes(m)
    catalog = m.get("errors")

    if catalog is None:
        if emitted:
            failures.append(
                f"errors: missing, and this module answers {len(emitted)} domain code(s) "
                f"({', '.join(sorted(emitted))}). ADR-0398: retiring one of them has to be a "
                f"visible change, and without the block nothing publishes them"
            )
        return
    if not expect("errors", catalog, dict):
        return

    for code, entry in sorted(catalog.items()):
        if len(code) > DOMAIN_CODE_MAX or not DOMAIN_CODE.match(code):
            failures.append(
                f"errors.{code}: not a domain code — the contract is `<module>.<snake_case>`, "
                f"{DOMAIN_CODE_MAX} characters at most (`errors::valid_domain_code`)"
            )
        elif not code.startswith(f"{m.get('id')}."):
            failures.append(
                f"errors.{code}: outside this module's namespace — the runtime rejects a code "
                f"a module does not own"
            )
        if not expect(f"errors.{code}", entry, dict):
            continue
        for key in sorted(set(entry) - ERROR_ENTRY_KEYS):
            failures.append(
                f"errors.{code}.{key}: not part of the contract — the value carries the STATE of "
                f"the code ({sorted(ERROR_ENTRY_KEYS)}), never its text. The sentence lives in "
                f"`locales/<lang>.json → errors` (ADR-0055)"
            )
        field(f"errors.{code}", entry, "deprecated", str)

    for code in sorted(emitted - set(catalog)):
        failures.append(
            f"errors: `{code}` is answered by this module but not declared. With `errors` present "
            f"the runtime is strict, so this code stops being a translatable rejection and "
            f"becomes `unexpected` (ADR-0398 §8.2)"
        )

    for code in sorted(set(catalog) - emitted):
        if isinstance(catalog[code], dict) and catalog[code].get("deprecated"):
            continue
        failures.append(
            f"errors.{code}: declared but nothing emits it. Either the code is gone — and then it "
            f"needs `deprecated` for one release before being removed — or the scan above lost "
            f"sight of where it is minted"
        )


def check_error_locales(m: dict) -> None:
    """Every code a command can answer must have its sentence in EN (source) and ES (ADR-0055).

    Includes the DECLARED catalogue, deprecated entries and all: a code still in the ABI is a code
    a hub can still answer, so the Spanish user must still be able to read it.
    """
    declared = emitted_codes(m) | set(m.get("errors") or {})
    if not declared:
        return
    for lang in ("en", "es"):
        path = MODULE_DIR / "locales" / f"{lang}.json"
        if not path.exists():
            failures.append(
                f"locales/{lang}.json: missing, and the error codes need it"
            )
            continue
        errors = json.loads(path.read_text()).get("errors")
        if not expect(f"locales/{lang}.json.errors", errors, dict):
            continue
        for code in sorted(declared - set(errors)):
            failures.append(
                f"locales/{lang}.json.errors: `{code}` is answered by a command but has no "
                f"translation — the screen would show the manifest's English"
            )
        for code in sorted(set(errors) - declared):
            failures.append(
                f"locales/{lang}.json.errors: `{code}` is translated but this module neither "
                f"emits nor declares it — a sentence for a code that does not exist"
            )


def check_events_and_slots(m: dict) -> None:
    events = m.get("events", {})
    if expect("events", events, dict):
        listen = events.get("listen", {})
        if expect("events.listen", listen, dict):
            for topic, listener in listen.items():
                path = f"events.listen.{topic}"
                if expect(path, listener, dict):
                    field(path, listener, "command", str, required=True)
        string_array("events.emits", events.get("emits", []))

    slots = m.get("provides_slots", [])
    if expect("provides_slots", slots, list):
        for i, slot in enumerate(slots):
            path = f"provides_slots[{i}]"
            if not expect(path, slot, dict):
                continue
            field(path, slot, "slot", str, required=True)
            field(path, slot, "component", str, required=True)
            field(path, slot, "permission", str)
            field(path, slot, "priority", int)

    if "ui" in m and expect("ui", m["ui"], dict):
        field("ui", m["ui"], "entry", str, required=True)

    if "agent" in m and expect("agent", m["agent"], dict):
        field("agent", m["agent"], "description", str, required=True)
        string_array("agent.keywords", m["agent"].get("keywords", []))


def check_scheduled_tasks(m: dict) -> None:
    """The block that shipped broken in v2.2.10 (tables#28).

    `catch_up` is a STRING enum, not a flag. A boolean here aborts `Manifest::load`, and with it
    the whole install — so this assertion is the one that must never go soft.
    """
    tasks = m.get("scheduled_tasks", [])
    if not expect("scheduled_tasks", tasks, list):
        return
    for i, task in enumerate(tasks):
        path = f"scheduled_tasks[{i}]"
        if not expect(path, task, dict):
            continue
        field(path, task, "name", str, required=True)
        field(path, task, "command", str, required=True)
        field(path, task, "cron", str, required=True)
        field(path, task, "payload", dict)
        if "catch_up" in task:
            if isinstance(task["catch_up"], bool):
                failures.append(
                    f"{path}.catch_up: {task['catch_up']!r} is a boolean — the contract is the "
                    f"string enum {list(CATCH_UP_VALUES)} (ADR-0011). This is tables#28: a "
                    f"boolean here makes the module impossible to install on ANY hub."
                )
            else:
                expect(f"{path}.catch_up", task["catch_up"], str, CATCH_UP_VALUES)

        command = task.get("command")
        if isinstance(command, str):
            if command not in m.get("commands", {}):
                failures.append(
                    f"{path}.command: {command!r} is not declared in `commands`"
                )
            if not command.startswith(f"{m.get('id')}."):
                failures.append(
                    f"{path}.command: {command!r} does not belong to this module"
                )


def check_setup(m: dict) -> None:
    """The `setup` block (tables#24) — the module's own answer to "am I configured?".

    Since hub#369 the RUNTIME parses this block (`SetupDef` in
    `hub/crates/runtime/src/manifest.rs`) instead of merely transporting it to the browser, so a
    malformed `setup` is a malformed manifest: exactly the failure mode of tables#28, one level
    deeper. The runtime is also deliberately FORGIVING at read time — a check it cannot make omits
    the item rather than reporting a false "you are missing X" (`setup-status.md` §5). That mercy
    is why these assertions have to be strict here: a `setup` pointing at a query that does not
    exist does not fail loudly on the hub, it just makes the item vanish from the checklist forever.
    """
    setup = m.get("setup")
    if setup is None:
        failures.append(
            "setup: missing — tables#24 requires the block so the floor plan shows up as an item "
            "of `hub.setup.status` (hub#369)"
        )
        return
    if not expect("setup", setup, dict):
        return

    for key in sorted(set(setup) - SETUP_KEYS):
        if key == "key":
            failures.append(
                "setup.key: must NOT be declared — the core derives it as `<module_id>.setup` "
                "precisely so a manifest cannot rename itself out of the ⛔ list"
            )
        else:
            failures.append(
                f"setup.{key}: not part of the contract, and the canonical schema declares "
                f"`additionalProperties: false`"
            )

    # ── The query: the module's own, declared, and a single-row read ──────────────────────
    query = field("setup", setup, "query", str, required=True)
    if isinstance(query, str):
        if not query.startswith(f"{m.get('id')}."):
            failures.append(
                f"setup.query: {query!r} is not a query of this module — the check must read the "
                f"module's own data"
            )
        qdef = (m.get("queries") or {}).get(query)
        if qdef is None:
            failures.append(
                f"setup.query: {query!r} is not declared in `queries`. The runtime omits an item "
                f"whose check fails, so this does not go red on the hub — the floor plan simply "
                f"never appears in the checklist."
            )
        elif isinstance(qdef, dict) and "list" in qdef:
            failures.append(
                f"setup.query: {query!r} declares a `list` block. The status query answers ONE "
                f"row (the runtime reads `rows.first()`); paginating it advertises a listing that "
                f"nobody lists."
            )

    field("setup", setup, "params", dict)

    # ── configured_when: every check must be able to pass ─────────────────────────────────
    checks = setup.get("configured_when")
    if checks is None:
        failures.append("setup.configured_when: missing, and the runtime requires it")
    elif expect("setup.configured_when", checks, list):
        if not checks:
            failures.append(
                "setup.configured_when: empty — that makes 'there is a row' the whole contract, "
                "and this query always returns a row (it is an aggregate)"
            )
        for i, chk in enumerate(checks):
            path = f"setup.configured_when[{i}]"
            if not expect(path, chk, dict):
                continue
            field(path, chk, "field", str, required=True)
            for extra in sorted(set(chk) - {"field", "truthy", "equals"}):
                failures.append(f"{path}.{extra}: not part of the check contract")
            has_truthy = "truthy" in chk
            has_equals = "equals" in chk
            if has_truthy:
                expect(f"{path}.truthy", chk["truthy"], bool)
            if has_truthy == has_equals:
                # `passes()` returns false when NEITHER is set — a check that can never pass, so
                # the item can never be ticked. Both set is just as wrong: `truthy` wins and
                # `equals` is silently ignored.
                reason = (
                    "`truthy` wins and `equals` is silently ignored"
                    if has_truthy
                    else "the check never passes, so the item stays pending forever"
                )
                failures.append(
                    f"{path}: needs EXACTLY one of `truthy` / `equals`, got "
                    f"{'both' if has_truthy else 'neither'} — {reason}"
                )

    # ── The strings the user sees ─────────────────────────────────────────────────────────
    title = field("setup", setup, "title", str, required=True)
    if isinstance(title, str) and not title.strip():
        failures.append("setup.title: empty")
    field("setup", setup, "description", str)
    field("setup", setup, "icon", str)

    # ── The route must be a screen that actually exists ───────────────────────────────────
    route = field("setup", setup, "route", str, required=True)
    if isinstance(route, str):
        prefix = f"/m/{m.get('id')}/"
        if not route.startswith(prefix):
            failures.append(
                f"setup.route: {route!r} does not start with {prefix!r} — the shell routes a "
                f"module screen as `/m/:moduleId/:navId`"
            )
        else:
            nav_id = route[len(prefix) :].split("/")[0]
            nav_ids = {
                e.get("id") for e in m.get("navigation", []) if isinstance(e, dict)
            }
            if nav_id not in nav_ids:
                failures.append(
                    f"setup.route: {route!r} points at nav id {nav_id!r}, which this module does "
                    f"not declare — the CTA of the checklist would land on a dead screen"
                )

    # ── The permission is the one to CONFIGURE, not the one to look ───────────────────────
    permission = field("setup", setup, "permission", str)
    if isinstance(permission, str) and permission:
        if permission not in (m.get("permissions") or []):
            failures.append(
                f"setup.permission: {permission!r} is not declared in `permissions`, so nobody "
                f"can ever hold it and the item is hidden from everyone"
            )
        read_permission = ((m.get("queries") or {}).get(query) or {}).get("permission")
        if permission == read_permission:
            failures.append(
                f"setup.permission: {permission!r} is the permission to READ the check. It has to "
                f"be the narrower one to CONFIGURE (setup-status.md §5): whoever can only look "
                f"must not be handed a task they cannot finish."
            )

    # ── countries / order / required: the fields hub#369 added ────────────────────────────
    countries = setup.get("countries")
    if countries is not None and expect("setup.countries", countries, list):
        for i, code in enumerate(countries):
            if expect(f"setup.countries[{i}]", code, str) and len(code) != 2:
                failures.append(
                    f"setup.countries[{i}]: {code!r} is not an ISO-3166-1 alpha-2 code"
                )
    if countries:
        failures.append(
            f"setup.countries: {countries!r} — a dining room is not a national obligation; "
            f"scoping it by country would hide the item from every hub outside that list"
        )

    if "order" not in setup:
        failures.append(
            f"setup.order: missing — absent means 500, behind everything the core placed. "
            f"The core reserved slot {SETUP_ORDER} for `tables`."
        )
    elif expect("setup.order", setup["order"], int) and setup["order"] != SETUP_ORDER:
        failures.append(
            f"setup.order: {setup['order']!r} — the scale belongs to the core and it assigned "
            f"`tables` slot {SETUP_ORDER} (setup-status.md §6). Do not pick your own."
        )

    if "required" not in setup:
        failures.append(
            "setup.required: missing — it defaults to `true` (🔴 functional), so omitting it "
            "CLAIMS a level. Since hub#369 a 🟡 item is no longer dropped from the checklist, so "
            "there is nothing left to gain by leaving it out: write it down."
        )
    elif expect("setup.required", setup["required"], bool):
        if setup["required"] != SETUP_REQUIRED:
            failures.append(
                f"setup.required: {setup['required']!r} — slot {SETUP_ORDER} is 🟡 recommended in "
                f"the core's table, not 🔴. A hub still sells with an empty floor plan."
            )


def check_setup_locales(m: dict) -> None:
    """`title`/`description` are ENGLISH canonical in the manifest; every locale carries its own.

    ADR-0055: what travels in the manifest is the fallback, and the shell translates. English being
    the *source* is not the same as the app being in English — a Spanish user must read this item
    in Spanish, so a `setup` block without its `es` translation is half-shipped.
    """
    setup = m.get("setup")
    if not isinstance(setup, dict):
        return
    locales_dir = MODULE_DIR / "locales"
    if not locales_dir.is_dir():
        failures.append("locales/: missing, so `setup.title` can never be translated")
        return

    for path in sorted(locales_dir.glob("*.json")):
        lang = path.stem
        try:
            data = json.loads(path.read_text())
        except json.JSONDecodeError as exc:
            failures.append(f"locales/{lang}.json: not valid JSON ({exc})")
            continue
        block = data.get("setup")
        if not isinstance(block, dict):
            failures.append(
                f"locales/{lang}.json: no `setup` block — the checklist item would fall back to "
                f"English for a {lang} user"
            )
            continue
        for key in ("title", "description"):
            value = block.get(key)
            if not isinstance(value, str) or not value.strip():
                failures.append(
                    f"locales/{lang}.json: `setup.{key}` is missing or empty"
                )
                continue
            # English is the SOURCE: if `en.json` and the manifest disagree, one of the two is
            # stale and there is no way to tell which from here.
            if lang == "en" and value != setup.get(key):
                failures.append(
                    f"locales/en.json: `setup.{key}` is {value!r} but module.json says "
                    f"{setup.get(key)!r} — the English source cannot say two things"
                )


def check_unknown_top_level(m: dict) -> None:
    for key in sorted(set(m) - KNOWN_TOP_LEVEL):
        warnings.append(
            f"{key}: not a block this test knows about — the canonical schema declares "
            f"`additionalProperties: false`, so either it is a typo or this list is stale"
        )


# ── Layer 2: the canonical JSON Schema, when it is reachable ─────────────────────────────


SCHEMA_REL = "schemas/module.schema.json"
SCHEMA_REF = os.environ.get("ERPLORA_MODULE_SCHEMA_REF", "origin/develop")

# Set to False as soon as the canonical schema is actually applied, so the final line can say so.
# A run where layer 2 quietly did nothing must not read like a full green.
schema_applied = False


def hub_checkout() -> pathlib.Path:
    """Dev workspace layout: <root>/modules-workspace/modules/<id>/ next to <root>/hub/."""
    return MODULE_DIR.parents[2] / "hub"


def schema_from_git() -> tuple[str, str] | None:
    """Read the schema from the hub's `origin/develop` — the branch the contract lives on.

    inventory#31: a hub working tree parked on an older branch carries a PRE-hub#369 schema, which
    rejects `setup.order` / `setup.countries` and turns a CORRECT manifest red. Reading the blob
    out of git sidesteps whatever the checkout happens to have on disk, and needs no checkout
    juggling. Returns (label, text) or None.
    """
    hub = hub_checkout()
    if not (hub / ".git").exists():
        return None
    res = subprocess.run(
        ["git", "-C", str(hub), "show", f"{SCHEMA_REF}:{SCHEMA_REL}"],
        capture_output=True,
        text=True,
    )
    if res.returncode != 0:
        return None
    return f"{hub}@{SCHEMA_REF}:{SCHEMA_REL}", res.stdout


def canonical_schema_source() -> tuple[str, str] | None:
    """(label, text) of the schema to validate against, most authoritative first."""
    override = os.environ.get("ERPLORA_MODULE_SCHEMA")
    if override:
        path = pathlib.Path(override)
        return (str(path), path.read_text()) if path.exists() else None

    from_git = schema_from_git()
    if from_git is not None:
        return from_git

    working_tree = hub_checkout() / SCHEMA_REL
    if working_tree.exists():
        return str(working_tree), working_tree.read_text()
    return None


def schema_predates_contract(schema: dict) -> list[str]:
    """Which hub#369 properties the schema is missing. Non-empty ⇒ it predates the contract."""
    props = (
        schema.get("properties", {}).get("setup", {}).get("properties", {})
        if isinstance(schema.get("properties"), dict)
        else {}
    )
    if not props:
        return list(SETUP_CONTRACT_KEYS)
    return [k for k in SETUP_CONTRACT_KEYS if k not in props]


def check_against_canonical_schema(m: dict) -> None:
    global schema_applied
    try:
        import jsonschema
    except ImportError:
        notes.append(
            "SKIPPED canonical schema: `jsonschema` is not installed (pip install jsonschema)"
        )
        return

    source = canonical_schema_source()
    if source is None:
        notes.append(
            f"SKIPPED canonical schema: could not reach {SCHEMA_REL} — no {SCHEMA_REF} in the "
            f"sibling hub checkout ({hub_checkout()}) and no ERPLORA_MODULE_SCHEMA set. "
            f"Fix: `git -C <hub> fetch origin`, or point ERPLORA_MODULE_SCHEMA at the file."
        )
        return

    label, text = source
    try:
        schema = json.loads(text)
    except json.JSONDecodeError as exc:
        notes.append(f"SKIPPED canonical schema: {label} is not valid JSON ({exc})")
        return

    missing = schema_predates_contract(schema)
    if missing:
        # Deliberately a SKIP and not a pass: this schema would reject `setup.order` /
        # `setup.countries`, so applying it would report a manifest that follows the contract as
        # broken. Deliberately not a silent one either — a gate nobody notices is off is how the
        # contract drifts back.
        notes.append(
            f"SKIPPED canonical schema: {label} predates hub#369 — its `setup` block has no "
            f"{missing}. Validating against it would REJECT a manifest that is correct "
            f"(inventory#31). Fix: fetch the hub, or set ERPLORA_MODULE_SCHEMA / "
            f"ERPLORA_MODULE_SCHEMA_REF to a schema that carries the contract."
        )
        return

    validator = jsonschema.Draft202012Validator(schema)
    schema_applied = True
    notes.append(f"canonical schema applied: {label}")
    for err in sorted(validator.iter_errors(m), key=lambda e: list(e.absolute_path)):
        where = "/".join(str(p) for p in err.absolute_path) or "<root>"
        failures.append(f"[schema] {where}: {err.message}")


# ── Layer 3: everything the manifest points at is in the package ─────────────────────────


def check_declared_files_exist(m: dict) -> None:
    declared: list[tuple[str, str]] = []

    for block in ("migrations", "seed"):
        for dialect, files in (m.get(block) or {}).items():
            # `migration_files` reads BOTH shapes. Filtering to `isinstance(f, str)` here, which is
            # what this did before, meant a `{ file, kind: "contract" }` entry pointing at a file
            # that is NOT in the package was never checked at all — the one entry shape that ships
            # a DROP was also the one nobody verified existed.
            declared += [(f"{block}.{dialect}", f) for f in migration_files(files)]

    for name, q in (m.get("queries") or {}).items():
        for key in ("sql", "schema"):
            if isinstance(q, dict) and isinstance(q.get(key), str):
                declared.append((f"queries.{name}.{key}", q[key]))

    for name, c in (m.get("commands") or {}).items():
        if not isinstance(c, dict):
            continue
        for rel in c.get("sql") or []:
            if isinstance(rel, str):
                declared.append((f"commands.{name}.sql", rel))
        if isinstance(c.get("schema"), str):
            declared.append((f"commands.{name}.schema", c["schema"]))
        handler = c.get("handler")
        if isinstance(handler, dict) and isinstance(handler.get("file"), str):
            declared.append((f"commands.{name}.handler.file", handler["file"]))

    if isinstance(m.get("ui"), dict) and isinstance(m["ui"].get("entry"), str):
        declared.append(("ui.entry", m["ui"]["entry"]))
    if isinstance(m.get("settings"), dict) and isinstance(
        m["settings"].get("schema"), str
    ):
        declared.append(("settings.schema", m["settings"]["schema"]))

    for where, rel in declared:
        if not (MODULE_DIR / rel).exists():
            failures.append(f"{where}: declares `{rel}`, which is not in the package")


# ── Runner ───────────────────────────────────────────────────────────────────────────────


def main() -> int:
    raw = MANIFEST_PATH.read_text()
    try:
        manifest = json.loads(raw)
    except json.JSONDecodeError as exc:
        print(f"FAILED — module.json is not valid JSON: {exc}")
        return 1

    check_identity(manifest)
    check_permissions(manifest)
    check_navigation(manifest)
    check_sql_blocks(manifest)
    check_events_and_slots(manifest)
    check_scheduled_tasks(manifest)
    check_setup(manifest)
    check_setup_locales(manifest)
    check_error_catalog(manifest)
    check_error_locales(manifest)
    check_unknown_top_level(manifest)
    check_against_canonical_schema(manifest)
    check_declared_files_exist(manifest)

    for note in notes:
        print(f"  · {note}")
    for warning in warnings:
        print(f"  ! {warning}")
    print()

    if failures:
        print(f"FAILED — {len(failures)} contract violation(s) in module.json:")
        for f in failures:
            print(f"  - {f}")
        return 1
    # Say out loud which layers actually ran: "PASS" with layer 2 silently skipped is the shape of
    # green this file exists to prevent.
    layer2 = (
        "canonical schema applied"
        if schema_applied
        else "canonical schema SKIPPED, see above"
    )
    print(
        f"PASS — module.json v{manifest.get('version')} parses the way the runtime parses it "
        f"({layer2})"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
