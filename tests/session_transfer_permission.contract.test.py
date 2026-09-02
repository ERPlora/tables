#!/usr/bin/env python3
"""tables#66 — moving a check to someone ELSE is its own key, not the one for closing it.

`tables.change_tablesession` was a single key for five different acts: correcting the covers,
parking, restoring and closing the check — all routine service — and TRANSFERRING or MERGING it,
which changes who owns the money. A room could either hand a waiter all five or none, so the gate
every reference POS ships simply did not exist here.

What the market does — the act that changes OWNERSHIP is always a separate permission, never the
one for ringing and closing:

  · Lightspeed Restaurant K-Series: «Table transfer» is its own checkbox in the POS user group,
    next to (not inside) «Table access».
  · Lightspeed Restaurant (Resto): transferring ownership of one's own open receipts is a
    permission of its own, meant for shift handover.
  · Toast: `1.16 Change Table` + `1.17 Change Server` (and `3.4 Bulk Transfer Checks` for the bulk
    move) are permissions of their own; an employee without them gets a MANAGER PASSCODE prompt
    instead of a refusal.
  · Square for Restaurants: moving a check that belongs to somebody else asks for a permission /
    passcode.
  · Oracle Simphony: dedicated role privileges authorise transferring checks, within a revenue
    centre and between revenue centres.
  · Revel: «Only order owner may close check» — the acts that touch someone else's check fall back
    to a manager PIN.
  · Shopify POS: selected POS permissions are put behind a manager approval rather than removed.
  · Microsoft Dynamics 365 / AX POS: permissions are declared per POS OPERATION, one row each.
  · And the reason is not theoretical — a manager in the Toast community asked for exactly this
    because several waiters were transferring their tables to someone else in order to clock out
    early.

🔴 THE GRANT IS ADDITIVE, AND THAT IS THE POINT. A module's permission names are external contract:
a live hub has roles already granted against them (`permissions_for_role` is the union of the
`role_permissions` of the ACTIVE modules, recomputed from the manifests on every read — hub
`crates/runtime/src/identity.rs`). So RENAMING `change_tablesession` would silently take the whole
session surface away from every waiter on update. A NEW key, granted by default to every role that
could already do it, changes nothing for anybody: what it buys is that a room which wants the gate
can now take one key away instead of taking five.

Usage: tests/session_transfer_permission.contract.test.py   (exit 0 = green)
"""

import json
import pathlib
import subprocess
import sys

MODULE_DIR = pathlib.Path(__file__).resolve().parents[1]
MANIFEST = json.loads((MODULE_DIR / "module.json").read_text())

TRANSFER_PERMISSION = "tables.transfer_tablesession"
SESSION_PERMISSION = "tables.change_tablesession"

# The two acts that hand a check to a different table or fold it into another one, plus the
# internal ops each of them pushes. The internal op has to carry the SAME key: the runtime checks
# every operation a handler emits against the permissions of whoever called the command (the
# "ceiling", hub#459), so an internal op left on the old key would refuse the transfer for a user
# who holds the new one and nothing else.
TRANSFER_COMMANDS = {
    "tables.sessions.transfer",
    "tables.sessions.merge",
    "tables._session_transfer",
    "tables._session_merge",
}

# Routine service. These must NOT move: splitting a bill, correcting the covers, parking a check
# while the party waits and closing it are what a waiter does all night, and a room that revokes
# the transfer key must keep every one of them.
ROUTINE_COMMANDS = {
    "tables.sessions.close",
    "tables.sessions.split",
    "tables.sessions.park",
    "tables.sessions.restore",
    "tables.sessions.set_guests",
    "tables.tables.hold",
    "tables.tables.release_hold",
    "tables.tables.expire_holds",
    "tables._session_close",
    "tables._session_split",
    "tables._session_close_by_order",
    "tables._hold_from_reservation",
    "tables._hold_move_from_reservation",
}

failures: list[str] = []
notes: list[str] = []


def fail(message: str) -> None:
    failures.append(message)


def check_permission_is_declared() -> None:
    declared = MANIFEST.get("permissions") or []
    if TRANSFER_PERMISSION not in declared:
        fail(
            f"permissions: `{TRANSFER_PERMISSION}` is not declared — the commands below cannot "
            f"demand a key the manifest does not mint"
        )
    if SESSION_PERMISSION not in declared:
        fail(
            f"permissions: `{SESSION_PERMISSION}` is gone. It is EXTERNAL CONTRACT — live hubs "
            f"grant it to their roles today — so it may only be retired deliberately, never as a "
            f"side effect of splitting the transfer out of it"
        )


def check_commands_demand_the_right_key() -> None:
    commands = MANIFEST.get("commands") or {}
    for name in sorted(TRANSFER_COMMANDS):
        cmd = commands.get(name)
        if not isinstance(cmd, dict):
            fail(f"commands.{name}: not declared")
            continue
        if cmd.get("permission") != TRANSFER_PERMISSION:
            fail(
                f"commands.{name}.permission: {cmd.get('permission')!r} — moving a check to "
                f"another table or into another check must ask for `{TRANSFER_PERMISSION}`, "
                f"and only that"
            )
    for name in sorted(ROUTINE_COMMANDS):
        cmd = commands.get(name)
        if not isinstance(cmd, dict):
            fail(f"commands.{name}: not declared")
            continue
        if cmd.get("permission") != SESSION_PERMISSION:
            fail(
                f"commands.{name}.permission: {cmd.get('permission')!r} — routine service stays "
                f"on `{SESSION_PERMISSION}`. A room that revokes the transfer key must not lose "
                f"the ability to close, park or correct a check"
            )


def check_nobody_loses_surface() -> None:
    """Every role that could transfer YESTERDAY must still be able to transfer TODAY.

    Derived, not hard-coded: whoever holds the old key held the transfer power, because that key
    was the one the two commands demanded. `*` already covers everything.
    """
    roles = MANIFEST.get("role_permissions") or {}
    for role, granted in sorted(roles.items()):
        if not isinstance(granted, list) or "*" in granted:
            continue
        if SESSION_PERMISSION in granted and TRANSFER_PERMISSION not in granted:
            fail(
                f"role_permissions.{role}: holds `{SESSION_PERMISSION}` but not "
                f"`{TRANSFER_PERMISSION}`, so updating the module would TAKE transfer and merge "
                f"away from a role that has them today. The split is additive on purpose: the hub "
                f"that wants the gate removes the key, the update never does it for them"
            )
        for perm in granted:
            if perm != "*" and perm not in (MANIFEST.get("permissions") or []):
                fail(
                    f"role_permissions.{role}: grants `{perm}`, which this module does not declare"
                )


def check_no_published_permission_disappeared() -> None:
    """The permission names of the last PUBLISHED release must all still be declared.

    Same technique ADR-0398 uses for the error catalogue, and for the same reason: the marketplace
    serves whatever the last `chore(release)` commit says, so that commit IS the version live hubs
    run. A permission that vanishes between it and now is a role losing its grants at update time,
    silently — which is exactly the failure this issue is splitting a key to avoid.
    """
    res = subprocess.run(
        [
            "git",
            "-C",
            str(MODULE_DIR),
            "log",
            "--grep=^chore(release)",
            "-1",
            "--format=%H",
        ],
        capture_output=True,
        text=True,
    )
    if res.returncode != 0 or not res.stdout.strip():
        notes.append(
            "SKIPPED previous-release comparison: no `chore(release)` commit reachable "
            "(shallow checkout, or a module that has never been published)"
        )
        return
    sha = res.stdout.strip()
    show = subprocess.run(
        ["git", "-C", str(MODULE_DIR), "show", f"{sha}:module.json"],
        capture_output=True,
        text=True,
    )
    if show.returncode != 0:
        notes.append(
            f"SKIPPED previous-release comparison: cannot read module.json at {sha[:7]}"
        )
        return
    previous = json.loads(show.stdout)
    notes.append(
        f"previous release {previous.get('version')} ({sha[:7]}) compared for permission removals"
    )
    now = set(MANIFEST.get("permissions") or [])
    for perm in sorted(set(previous.get("permissions") or []) - now):
        fail(
            f"permissions: `{perm}` was published in v{previous.get('version')} and is gone now. "
            f"A permission name is external contract — renaming one revokes it on every live hub"
        )


def main() -> int:
    check_permission_is_declared()
    check_commands_demand_the_right_key()
    check_nobody_loses_surface()
    check_no_published_permission_disappeared()

    for note in notes:
        print(f"  · {note}")
    if failures:
        print(f"\nFAILED — {len(failures)} contract violation(s):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print(
        f"\nPASS — `{TRANSFER_PERMISSION}` gates transfer and merge, routine service keeps "
        f"`{SESSION_PERMISSION}`, and no role loses what it already had"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
