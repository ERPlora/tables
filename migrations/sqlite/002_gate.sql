-- Tables · tabla guardia para los gates WASM (Tier 2 — WASM-TODO.md).
-- Mecanismo de aborto declarativo (mismo patrón que reservations__gate): cada
-- command "gated" (borrados con guarda, apertura/cierre/transferencia de sesión,
-- alta en lote) inserta aquí el resultado de su assert; si el gate no pasó
-- (ok = 0) el CHECK aborta el statement y revierte la transacción completa del
-- command (SQLite no permite RAISE fuera de triggers). El propio command la
-- limpia en su último statement, así que en reposo está vacía.
CREATE TABLE IF NOT EXISTS tables__gate (
    gate TEXT NOT NULL,                 -- nombre del gate (diagnóstico del error)
    ok   INTEGER NOT NULL CHECK (ok = 1)
);
