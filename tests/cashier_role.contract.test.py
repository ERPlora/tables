#!/usr/bin/env python3
"""sales#100 — the `cashier` role is DECLARED by `sales` (a job / permission set, never an identity:
Toast, Square, Lightspeed, Mindbody, Vagaro — decided in ERPlora/pm#9) and every module the till
touches GRANTS to that key what a cashier needs there. The runtime does not inherit from `employee`
(`permissions_for_role` = union of what each active module grants to the key), so a hub that
switches the role on and installs this module without this grant hands the cashier a POS with no
floor plan: the `sales.pos.assign` slot (`tables.view_table`) never renders and nobody can seat,
transfer or close a table.

Contract: what tables grants to `cashier` — the whole SESSION surface (seat, guests, transfer,
merge, park, close), and NOT the floor plan itself. Editing zones and tables is a manager job in
every reference (Toast configures tables in Toast Web, Lightspeed under user/floor-plan admin,
Odoo in the POS edit mode), and a cashier who can delete a zone deletes the room mid-service.
Usage: tests/cashier_role.contract.test.py   (exit 0 = green)
"""

import json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
m = json.loads((ROOT / "module.json").read_text())
grants = m.get("role_permissions", {}).get("cashier")
MUST = [
    "tables.view_zone",
    "tables.view_table",
    "tables.view_tablesession",
    "tables.add_tablesession",
    "tables.change_tablesession",
    # tables#66 — transfer and merge left `change_tablesession` for a key of their own. The cashier
    # keeps them by default: the split exists so a room CAN close that gate (Lightspeed's «Table
    # transfer» checkbox, Toast's manager passcode), not so the update closes it for them.
    "tables.transfer_tablesession",
    "tables.view_settings",
]
MUST_NOT = [
    "tables.add_zone",
    "tables.change_zone",
    "tables.delete_zone",
    "tables.add_table",
    "tables.change_table",
    "tables.delete_table",
    "tables.delete_tablesession",
    "tables.manage_settings",
]

errors = []
if grants is None:
    errors.append("role_permissions.cashier is not declared")
else:
    for p in MUST:
        if p not in grants:
            errors.append(f"cashier lacks {p}")
    for p in MUST_NOT:
        if p in grants:
            errors.append(f"cashier must not get {p}")
    if "*" in grants:
        errors.append("cashier must never get *")
    for p in grants:
        if p not in m["permissions"]:
            errors.append(f"cashier is granted {p}, which this module does not declare")
for e in errors:
    print("FAIL:", e)
print("cashier role grants:", "OK" if not errors else f"{len(errors)} error(s)")
sys.exit(1 if errors else 0)
