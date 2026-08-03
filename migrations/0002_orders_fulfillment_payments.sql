ALTER TABLE orders ADD COLUMN product_type TEXT NOT NULL DEFAULT 'bracelet';
ALTER TABLE orders ADD COLUMN order_type TEXT NOT NULL DEFAULT 'custom';
ALTER TABLE orders ADD COLUMN product_options_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE orders ADD COLUMN fulfillment_method TEXT NOT NULL DEFAULT 'pickup';
ALTER TABLE orders ADD COLUMN shipping_address_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE orders ADD COLUMN estimate_complete INTEGER NOT NULL DEFAULT 1;
ALTER TABLE orders ADD COLUMN estimate_note TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'unpaid';
ALTER TABLE orders ADD COLUMN payment_method TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN amount_paid_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN paid_at TEXT;
ALTER TABLE orders ADD COLUMN payment_note TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_orders_product_type ON orders(product_type);
CREATE INDEX IF NOT EXISTS idx_orders_fulfillment ON orders(fulfillment_method);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
