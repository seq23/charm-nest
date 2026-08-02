PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS drops (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  month TEXT NOT NULL DEFAULT '',
  year INTEGER NOT NULL,
  headline TEXT NOT NULL DEFAULT '',
  public_notes TEXT NOT NULL DEFAULT '',
  private_notes TEXT NOT NULL DEFAULT '',
  colors_json TEXT NOT NULL DEFAULT '[]',
  color_hexes_json TEXT NOT NULL DEFAULT '[]',
  featured_charm TEXT NOT NULL DEFAULT '',
  beaded_available INTEGER NOT NULL DEFAULT 1,
  braided_available INTEGER NOT NULL DEFAULT 1,
  quantity INTEGER NOT NULL DEFAULT 0,
  school_price_cents INTEGER NOT NULL DEFAULT 200,
  custom_price_cents INTEGER NOT NULL DEFAULT 300,
  online_price_min_cents INTEGER NOT NULL DEFAULT 600,
  online_price_max_cents INTEGER NOT NULL DEFAULT 1500,
  release_date TEXT NOT NULL DEFAULT '',
  end_date TEXT NOT NULL DEFAULT '',
  tiktok_url TEXT NOT NULL DEFAULT '',
  etsy_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_drops_status ON drops(status);
CREATE INDEX IF NOT EXISTS idx_drops_dates ON drops(release_date, end_date);

CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  original_key TEXT NOT NULL,
  web_key TEXT NOT NULL,
  thumb_key TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  alt_text TEXT NOT NULL,
  caption TEXT NOT NULL DEFAULT '',
  no_faces_confirmed INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  uploaded_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  approved_by TEXT,
  approved_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_photos_status ON photos(status);

CREATE TABLE IF NOT EXISTS drop_photos (
  drop_id TEXT NOT NULL REFERENCES drops(id) ON DELETE CASCADE,
  photo_id TEXT NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  is_cover INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (drop_id, photo_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  bracelet_style TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  colors_json TEXT NOT NULL,
  charm TEXT NOT NULL DEFAULT '',
  name_word TEXT NOT NULL DEFAULT '',
  size TEXT NOT NULL DEFAULT 'standard',
  needed_by TEXT NOT NULL DEFAULT '',
  gift_packaging INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  estimated_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  role TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL DEFAULT '',
  details_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at DESC);

CREATE TABLE IF NOT EXISTS login_attempts (
  client_key TEXT PRIMARY KEY,
  failed_count INTEGER NOT NULL DEFAULT 0,
  first_failed_at TEXT,
  locked_until TEXT,
  last_attempt_at TEXT NOT NULL
);
