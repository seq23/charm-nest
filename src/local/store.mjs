import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_SETTINGS } from '../core/constants.mjs';
import { mergeSettings, newId, nowIso, serializeDrop, serializeOrder, serializePhoto } from '../core/store-utils.mjs';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dirname, '../..');

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

export class LocalStore {
  constructor({ dbPath = path.join(root, 'data/charmnest.sqlite'), uploadsDir = path.join(root, 'data/uploads') } = {}) {
    this.dbPath = dbPath;
    this.uploadsDir = uploadsDir;
    ensureDir(dbPath);
    fs.mkdirSync(uploadsDir, { recursive: true });
    this.db = new DatabaseSync(dbPath);
    this.db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  }

  init() {
    this.db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );`);
    const migrationDir = path.join(root, 'migrations');
    const files = fs.readdirSync(migrationDir).filter(name => name.endsWith('.sql')).sort();
    const applied = this.db.prepare('SELECT name FROM schema_migrations').all().map(row => row.name);
    const appliedSet = new Set(applied);
    const record = this.db.prepare('INSERT INTO schema_migrations(name,applied_at) VALUES(?,?)');
    for (const name of files) {
      if (appliedSet.has(name)) continue;
      const sql = fs.readFileSync(path.join(migrationDir, name), 'utf8');
      this.db.exec('BEGIN IMMEDIATE;');
      try {
        this.db.exec(sql);
        record.run(name, nowIso());
        this.db.exec('COMMIT;');
      } catch (error) {
        this.db.exec('ROLLBACK;');
        throw error;
      }
    }
    const now = nowIso();
    const insert = this.db.prepare('INSERT OR IGNORE INTO settings(key,value,updated_at) VALUES(?,?,?)');
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) insert.run(key, String(value), now);
  }

  getSettings() {
    return mergeSettings(this.db.prepare('SELECT key,value FROM settings').all());
  }

  updateSettings(patch, actor) {
    const now = nowIso();
    const upsert = this.db.prepare('INSERT INTO settings(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at');
    this.db.exec('BEGIN IMMEDIATE;');
    try {
      for (const [key, value] of Object.entries(patch)) upsert.run(key, String(value), now);
      this.db.exec('COMMIT;');
    } catch (error) {
      this.db.exec('ROLLBACK;');
      throw error;
    }
    this.log(actor, 'settings.update', 'settings', '', { keys: Object.keys(patch) });
    return this.getSettings();
  }

  savePaymentQr({ bytes, mimeType }, actor) {
    const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
    const key = `brand/payment/cashapp-qr.${ext}`;
    const filePath = path.join(this.uploadsDir, key);
    ensureDir(filePath);
    fs.writeFileSync(filePath, bytes);
    const settings = this.updateSettings({ cashAppQrUrl: `/media/${key}` }, actor);
    this.log(actor, 'settings.cashapp-qr.upload', 'settings', '', { mimeType, sizeBytes: bytes.length });
    return { url: settings.cashAppQrUrl };
  }

  listDrops({ includePrivate = false } = {}) {
    const rows = this.db.prepare(includePrivate
      ? 'SELECT * FROM drops ORDER BY updated_at DESC'
      : "SELECT * FROM drops WHERE status IN ('published','sold-out') ORDER BY published_at DESC, updated_at DESC").all();
    return rows.map(row => serializeDrop(row, this.photosForDrop(row.id, includePrivate)));
  }

  getCurrentDrop() {
    const row = this.db.prepare("SELECT * FROM drops WHERE status IN ('published','sold-out') ORDER BY CASE status WHEN 'published' THEN 0 ELSE 1 END, published_at DESC, updated_at DESC LIMIT 1").get();
    return row ? serializeDrop(row, this.photosForDrop(row.id, false)) : null;
  }

  getDrop(id, { includePrivate = true } = {}) {
    const row = this.db.prepare('SELECT * FROM drops WHERE id=?').get(id);
    return row ? serializeDrop(row, this.photosForDrop(id, includePrivate)) : null;
  }

  createDrop(data, actor) {
    const id = newId('drop');
    const now = nowIso();
    this.db.prepare(`INSERT INTO drops(id,name,slug,month,year,headline,public_notes,private_notes,colors_json,color_hexes_json,featured_charm,beaded_available,braided_available,quantity,school_price_cents,custom_price_cents,online_price_min_cents,online_price_max_cents,release_date,end_date,tiktok_url,etsy_url,status,created_by,created_at,updated_at,published_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      id, data.name, data.slug, data.month, data.year, data.headline, data.publicNotes, data.privateNotes,
      JSON.stringify(data.colors), JSON.stringify(data.colorHexes), data.featuredCharm,
      Number(data.beadedAvailable), Number(data.braidedAvailable), data.quantity,
      data.schoolPriceCents, data.customPriceCents, data.onlinePriceMinCents, data.onlinePriceMaxCents,
      data.releaseDate, data.endDate, data.tiktokUrl, data.etsyUrl, data.status,
      actor.username, now, now, data.status === 'published' ? now : null
    );
    this.log(actor, 'drop.create', 'drop', id, { name: data.name, status: data.status });
    return this.getDrop(id);
  }

  updateDrop(id, data, actor) {
    if (!this.getDrop(id)) return null;
    const now = nowIso();
    this.db.prepare(`UPDATE drops SET name=?,slug=?,month=?,year=?,headline=?,public_notes=?,private_notes=?,colors_json=?,color_hexes_json=?,featured_charm=?,beaded_available=?,braided_available=?,quantity=?,school_price_cents=?,custom_price_cents=?,online_price_min_cents=?,online_price_max_cents=?,release_date=?,end_date=?,tiktok_url=?,etsy_url=?,status=?,updated_at=?,published_at=CASE WHEN ?='published' AND published_at IS NULL THEN ? ELSE published_at END WHERE id=?`).run(
      data.name, data.slug, data.month, data.year, data.headline, data.publicNotes, data.privateNotes,
      JSON.stringify(data.colors), JSON.stringify(data.colorHexes), data.featuredCharm,
      Number(data.beadedAvailable), Number(data.braidedAvailable), data.quantity,
      data.schoolPriceCents, data.customPriceCents, data.onlinePriceMinCents, data.onlinePriceMaxCents,
      data.releaseDate, data.endDate, data.tiktokUrl, data.etsyUrl, data.status,
      now, data.status, now, id
    );
    this.log(actor, 'drop.update', 'drop', id, { name: data.name, status: data.status });
    return this.getDrop(id);
  }

  setDropStatus(id, status, actor) {
    const now = nowIso();
    const result = this.db.prepare("UPDATE drops SET status=?,updated_at=?,published_at=CASE WHEN ?='published' THEN COALESCE(published_at,?) ELSE published_at END WHERE id=?").run(status, now, status, now, id);
    if (!result.changes) return null;
    this.log(actor, 'drop.status', 'drop', id, { status });
    return this.getDrop(id);
  }

  listPhotos({ includePrivate = true } = {}) {
    const rows = this.db.prepare(includePrivate
      ? 'SELECT * FROM photos ORDER BY created_at DESC'
      : "SELECT * FROM photos WHERE status='approved' AND no_faces_confirmed=1 ORDER BY created_at DESC").all();
    return rows.map(serializePhoto);
  }

  getPhoto(id) {
    const row = this.db.prepare('SELECT * FROM photos WHERE id=?').get(id);
    return row ? serializePhoto(row) : null;
  }

  savePhoto({ meta, variants }, actor) {
    const id = newId('photo');
    const ext = meta.mimeType === 'image/png' ? 'png' : meta.mimeType === 'image/webp' ? 'webp' : 'jpg';
    const originalKey = `originals/${id}.${ext}`;
    const webKey = `web/${id}.webp`;
    const thumbKey = `thumbs/${id}.webp`;
    for (const [key, payload] of [[originalKey, variants.original], [webKey, variants.web], [thumbKey, variants.thumb]]) {
      const filePath = path.join(this.uploadsDir, key);
      ensureDir(filePath);
      fs.writeFileSync(filePath, payload);
    }
    const now = nowIso();
    this.db.prepare('INSERT INTO photos(id,original_key,web_key,thumb_key,original_name,mime_type,size_bytes,alt_text,caption,no_faces_confirmed,status,uploaded_by,created_at,placement,placement_drop_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
      id, originalKey, webKey, thumbKey, meta.originalName, meta.mimeType, variants.original.length,
      meta.altText, meta.caption, Number(meta.noFacesConfirmed), 'pending', actor.username, now,
      meta.placement || 'unassigned', meta.placementDropId || ''
    );
    this.log(actor, 'photo.upload', 'photo', id, { name: meta.originalName });
    return this.getPhoto(id);
  }

  approvePhoto(id, decision, actor) {
    const status = decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'archived';
    const now = nowIso();
    const result = this.db.prepare('UPDATE photos SET status=?,approved_by=?,approved_at=? WHERE id=?').run(status, actor.username, now, id);
    if (!result.changes) return null;
    this.log(actor, `photo.${status}`, 'photo', id, {});
    return this.getPhoto(id);
  }

  updatePhoto(id, data, actor) {
    const current = this.getPhoto(id);
    if (!current) return null;
    if (data.placement === 'monthly-drop' && !this.getDrop(data.placementDropId)) return null;
    const now = nowIso();
    this.db.exec('BEGIN IMMEDIATE;');
    try {
      this.db.prepare('UPDATE photos SET alt_text=?,caption=?,placement=?,placement_drop_id=? WHERE id=?').run(
        data.altText, data.caption, data.placement, data.placementDropId || '', id
      );
      this.db.prepare('DELETE FROM drop_photos WHERE photo_id=?').run(id);
      if (data.placement === 'monthly-drop' && data.placementDropId) {
        const cover = this.db.prepare('SELECT COUNT(*) AS count FROM drop_photos WHERE drop_id=? AND is_cover=1').get(data.placementDropId);
        this.db.prepare('INSERT INTO drop_photos(drop_id,photo_id,position,is_cover) VALUES(?,?,COALESCE((SELECT MAX(position)+1 FROM drop_photos WHERE drop_id=?),0),?)').run(
          data.placementDropId, id, data.placementDropId, Number(!cover?.count)
        );
      }
      this.db.exec('COMMIT;');
    } catch (error) {
      this.db.exec('ROLLBACK;');
      throw error;
    }
    this.log(actor, 'photo.update', 'photo', id, { placement: data.placement, placementDropId: data.placementDropId || '', updatedAt: now });
    return this.getPhoto(id);
  }

  attachPhoto(dropId, photoId, { isCover = false } = {}, actor) {
    if (isCover) this.db.prepare('UPDATE drop_photos SET is_cover=0 WHERE drop_id=?').run(dropId);
    this.db.prepare('INSERT INTO drop_photos(drop_id,photo_id,position,is_cover) VALUES(?,?,COALESCE((SELECT MAX(position)+1 FROM drop_photos WHERE drop_id=?),0),?) ON CONFLICT(drop_id,photo_id) DO UPDATE SET is_cover=excluded.is_cover').run(dropId, photoId, dropId, Number(isCover));
    this.log(actor, 'drop.photo.attach', 'drop', dropId, { photoId, isCover });
    return this.getDrop(dropId);
  }

  photosForDrop(dropId, includePrivate) {
    const sql = `SELECT p.*,dp.position,dp.is_cover FROM photos p JOIN drop_photos dp ON dp.photo_id=p.id WHERE dp.drop_id=? ${includePrivate ? '' : "AND p.status='approved' AND p.no_faces_confirmed=1"} ORDER BY dp.is_cover DESC,dp.position ASC`;
    return this.db.prepare(sql).all(dropId).map(row => ({ ...serializePhoto(row), isCover: Boolean(row.is_cover), position: row.position }));
  }

  getMedia(key) {
    const safe = String(key).replaceAll('..', '');
    const filePath = path.join(this.uploadsDir, safe);
    if (!filePath.startsWith(this.uploadsDir) || !fs.existsSync(filePath)) return null;
    return {
      bytes: fs.readFileSync(filePath),
      type: safe.endsWith('.webp') ? 'image/webp' : safe.endsWith('.png') ? 'image/png' : 'image/jpeg'
    };
  }

  createOrder(data) {
    const id = newId('order');
    const now = nowIso();
    const options = data.productOptions || {};
    this.db.prepare(`INSERT INTO orders(
      id,first_name,contact_email,bracelet_style,quantity,colors_json,charm,name_word,size,needed_by,gift_packaging,notes,estimated_cents,status,created_at,updated_at,
      product_type,order_type,product_options_json,fulfillment_method,shipping_address_json,estimate_complete,estimate_note,payment_status,payment_method,amount_paid_cents,paid_at,payment_note,
      phone,requested_employee,internal_note
    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      id, data.firstName, data.contactEmail, options.braceletStyle || '', data.quantity,
      JSON.stringify(options.colors || []), options.charm || '', options.nameWord || '', options.size || 'standard',
      data.neededBy, Number(Boolean(options.giftPackaging)), data.notes, data.estimatedCents, 'new', now, now,
      data.productType, data.orderType, JSON.stringify(options), data.fulfillmentMethod,
      JSON.stringify(data.shippingAddress || {}), Number(data.estimateComplete), data.estimateNote,
      'unpaid', '', 0, null, '', data.phone, data.requestedEmployee || '', ''
    );
    this.log({ username: 'public', role: 'public' }, 'order.create', 'order', id, {
      productType: data.productType,
      quantity: data.quantity,
      fulfillmentMethod: data.fulfillmentMethod
    });
    return serializeOrder(this.db.prepare('SELECT * FROM orders WHERE id=?').get(id), { includePrivate: false });
  }

  getOrder(id, { includePrivate = true } = {}) {
    const row = this.db.prepare('SELECT * FROM orders WHERE id=?').get(id);
    return row ? serializeOrder(row, { includePrivate }) : null;
  }

  listOrders({ includePrivate = false } = {}) {
    return this.db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all().map(row => serializeOrder(row, { includePrivate }));
  }

  updateOrderStatus(id, status, actor) {
    const now = nowIso();
    const result = this.db.prepare('UPDATE orders SET status=?,updated_at=? WHERE id=?').run(status, now, id);
    if (!result.changes) return null;
    this.log(actor, 'order.status', 'order', id, { status });
    return this.getOrder(id, { includePrivate: true });
  }

  updateOrderPayment(id, payment, actor) {
    const now = nowIso();
    const paidAt = payment.paymentStatus === 'received' ? (payment.paidAt || now) : null;
    const result = this.db.prepare('UPDATE orders SET payment_status=?,payment_method=?,amount_paid_cents=?,paid_at=?,payment_note=?,updated_at=? WHERE id=?').run(
      payment.paymentStatus, payment.paymentMethod, payment.amountPaidCents, paidAt, payment.paymentNote, now, id
    );
    if (!result.changes) return null;
    this.log(actor, 'order.payment', 'order', id, {
      paymentStatus: payment.paymentStatus,
      paymentMethod: payment.paymentMethod,
      amountPaidCents: payment.amountPaidCents
    });
    return this.getOrder(id, { includePrivate: true });
  }

  updateOrderInternalNote(id, internalNote, actor) {
    const now = nowIso();
    const result = this.db.prepare('UPDATE orders SET internal_note=?,updated_at=? WHERE id=?').run(internalNote, now, id);
    if (!result.changes) return null;
    this.log(actor, 'order.internal-note', 'order', id, { hasNote: Boolean(internalNote) });
    return this.getOrder(id, { includePrivate: true });
  }

  listActivity(limit = 100) {
    return this.db.prepare('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ?').all(limit).map(row => ({
      ...row,
      details: JSON.parse(row.details_json || '{}')
    }));
  }

  log(actor, action, type, id, details = {}) {
    this.db.prepare('INSERT INTO activity_log(id,actor,role,action,entity_type,entity_id,details_json,created_at) VALUES(?,?,?,?,?,?,?,?)').run(
      newId('act'), actor.username || 'system', actor.role || 'system', action, type, id || '', JSON.stringify(details), nowIso()
    );
  }

  checkLoginLimit(key) {
    const row = this.db.prepare('SELECT * FROM login_attempts WHERE client_key=?').get(key);
    if (!row?.locked_until) return { allowed: true };
    const lockTime = Date.parse(row.locked_until);
    return lockTime > Date.now()
      ? { allowed: false, retryAfter: Math.ceil((lockTime - Date.now()) / 1000) }
      : { allowed: true };
  }

  recordLogin(key, success) {
    if (success) {
      this.db.prepare('DELETE FROM login_attempts WHERE client_key=?').run(key);
      return;
    }
    const current = this.db.prepare('SELECT * FROM login_attempts WHERE client_key=?').get(key);
    const failed = (current?.failed_count || 0) + 1;
    const now = nowIso();
    const lockedUntil = failed >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;
    this.db.prepare('INSERT INTO login_attempts(client_key,failed_count,first_failed_at,locked_until,last_attempt_at) VALUES(?,?,?,?,?) ON CONFLICT(client_key) DO UPDATE SET failed_count=excluded.failed_count,locked_until=excluded.locked_until,last_attempt_at=excluded.last_attempt_at').run(
      key, failed, current?.first_failed_at || now, lockedUntil, now
    );
  }
}
