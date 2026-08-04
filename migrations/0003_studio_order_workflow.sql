ALTER TABLE orders ADD COLUMN phone TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN requested_employee TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN internal_note TEXT NOT NULL DEFAULT '';

ALTER TABLE photos ADD COLUMN placement TEXT NOT NULL DEFAULT 'unassigned';
ALTER TABLE photos ADD COLUMN placement_drop_id TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone);
CREATE INDEX IF NOT EXISTS idx_orders_requested_employee ON orders(requested_employee);
CREATE INDEX IF NOT EXISTS idx_photos_placement ON photos(placement);
CREATE INDEX IF NOT EXISTS idx_photos_placement_drop ON photos(placement_drop_id);
