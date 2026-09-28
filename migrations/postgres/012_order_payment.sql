-- 012_order_payment.sql — tables#96: what each check CHARGED.
--
-- Sessions › Closed printed the order's internal id under «Check» and no amount anywhere. The
-- money lives in `sales`, and contract §2.5 forbids `tables` from joining its tables — so, like the
-- reservation holds of 008, `tables` keeps ITS OWN record, fed by the events `sales` already emits:
-- `sale.completed` (every charge, the partial ones of a split bill too) and `sale.voided`.
--
-- One row per SALE, not per order: a split bill is N sales on one order, and the at-least-once
-- outbox may redeliver any of them — the unique (hub_id, sale_id) is what makes a redelivery a
-- no-op instead of a double charge on the screen. `order_id` is the key the check is found by: it
-- is the junction `tables` owns (`tables_session.order_id`), and transfer/merge already move it to
-- whichever session holds the check, so the amount follows the check with no extra bookkeeping.
--
-- Additive (new table, nothing existing changes): rolling the module back leaves it unread.
CREATE TABLE IF NOT EXISTS tables_order_payment (
    id          TEXT PRIMARY KEY,
    hub_id      TEXT NOT NULL,
    order_id    TEXT NOT NULL,
    sale_id     TEXT NOT NULL,
    -- Cents, exactly as `sales` emits `total` (never a float).
    total       BIGINT NOT NULL DEFAULT 0,
    -- `paid` counts · `voided` the sale was annulled and no longer counts.
    status      TEXT NOT NULL DEFAULT 'paid',
    is_deleted  INTEGER NOT NULL DEFAULT 0,
    deleted_at  TEXT,
    created_by  TEXT,
    updated_by  TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT,
    CONSTRAINT ck_tables_order_payment_status CHECK (status IN ('paid', 'voided'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tables_order_payment_sale
    ON tables_order_payment (hub_id, sale_id);

-- The only read: «what did this check's order charge» (sessions list, one row per session).
CREATE INDEX IF NOT EXISTS ix_tables_order_payment_order
    ON tables_order_payment (hub_id, order_id, status);
