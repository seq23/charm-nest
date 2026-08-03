import { DEFAULT_SETTINGS } from '../core/constants.mjs';
import { mergeSettings, newId, nowIso, serializeDrop, serializeOrder, serializePhoto } from '../core/store-utils.mjs';

export class CloudflareStore {
  constructor(env) {
    this.db = env.DB;
    this.media = env.MEDIA;
  }

  async init() {
    const now = nowIso();
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      await this.db.prepare('INSERT OR IGNORE INTO settings(key,value,updated_at) VALUES(?,?,?)').bind(key, String(value), now).run();
    }
  }

  async getSettings() {
    const { results = [] } = await this.db.prepare('SELECT key,value FROM settings').all();
    return mergeSettings(results);
  }

  async updateSettings(patch, actor) {
    const now = nowIso();
    for (const [key, value] of Object.entries(patch)) {
      await this.db.prepare('INSERT INTO settings(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at').bind(key, String(value), now).run();
    }
    await this.log(actor, 'settings.update', 'settings', '', { keys: Object.keys(patch) });
    return this.getSettings();
  }

  async savePaymentQr({ bytes, mimeType }, actor) {
    const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
    const key = `brand/payment/cashapp-qr.${ext}`;
    await this.media.put(key, bytes, { httpMetadata: { contentType: mimeType } });
    const settings = await this.updateSettings({ cashAppQrUrl: `/media/${key}` }, actor);
    await this.log(actor, 'settings.cashapp-qr.upload', 'settings', '', { mimeType, sizeBytes: bytes.length });
    return { url: settings.cashAppQrUrl };
  }

  async photosForDrop(id, includePrivate) {
    const sql = `SELECT p.*,dp.position,dp.is_cover FROM photos p JOIN drop_photos dp ON dp.photo_id=p.id WHERE dp.drop_id=? ${includePrivate ? '' : "AND p.status='approved' AND p.no_faces_confirmed=1"} ORDER BY dp.is_cover DESC,dp.position`;
    const { results = [] } = await this.db.prepare(sql).bind(id).all();
    return results.map(row => ({ ...serializePhoto(row), isCover: Boolean(row.is_cover), position: row.position }));
  }

  async listDrops({ includePrivate = false } = {}) {
    const sql = includePrivate
      ? 'SELECT * FROM drops ORDER BY updated_at DESC'
      : "SELECT * FROM drops WHERE status IN ('published','sold-out') ORDER BY published_at DESC,updated_at DESC";
    const { results = [] } = await this.db.prepare(sql).all();
    return Promise.all(results.map(async row => serializeDrop(row, await this.photosForDrop(row.id, includePrivate))));
  }

  async getCurrentDrop() {
    const row = await this.db.prepare("SELECT * FROM drops WHERE status IN ('published','sold-out') ORDER BY CASE status WHEN 'published' THEN 0 ELSE 1 END,published_at DESC,updated_at DESC LIMIT 1").first();
    return row ? serializeDrop(row, await this.photosForDrop(row.id, false)) : null;
  }

  async getDrop(id, { includePrivate = true } = {}) {
    const row = await this.db.prepare('SELECT * FROM drops WHERE id=?').bind(id).first();
    return row ? serializeDrop(row, await this.photosForDrop(id, includePrivate)) : null;
  }

  async createDrop(data, actor) {
    const id = newId('drop');
    const now = nowIso();
    await this.db.prepare(`INSERT INTO drops(id,name,slug,month,year,headline,public_notes,private_notes,colors_json,color_hexes_json,featured_charm,beaded_available,braided_available,quantity,school_price_cents,custom_price_cents,online_price_min_cents,online_price_max_cents,release_date,end_date,tiktok_url,etsy_url,status,created_by,created_at,updated_at,published_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
      id, data.name, data.slug, data.month, data.year, data.headline, data.publicNotes, data.privateNotes,
      JSON.stringify(data.colors), JSON.stringify(data.colorHexes), data.featuredCharm,
      Number(data.beadedAvailable), Number(data.braidedAvailable), data.quantity,
      data.schoolPriceCents, data.customPriceCents, data.onlinePriceMinCents, data.onlinePriceMaxCents,
      data.releaseDate, data.endDate, data.tiktokUrl, data.etsyUrl, data.status,
      actor.username, now, now, data.status === 'published' ? now : null
    ).run();
    await this.log(actor, 'drop.create', 'drop', id, { name: data.name, status: data.status });
    return this.getDrop(id);
  }

  async updateDrop(id, data, actor) {
    if (!await this.getDrop(id)) return null;
    const now = nowIso();
    await this.db.prepare(`UPDATE drops SET name=?,slug=?,month=?,year=?,headline=?,public_notes=?,private_notes=?,colors_json=?,color_hexes_json=?,featured_charm=?,beaded_available=?,braided_available=?,quantity=?,school_price_cents=?,custom_price_cents=?,online_price_min_cents=?,online_price_max_cents=?,release_date=?,end_date=?,tiktok_url=?,etsy_url=?,status=?,updated_at=?,published_at=CASE WHEN ?='published' AND published_at IS NULL THEN ? ELSE published_at END WHERE id=?`).bind(
      data.name, data.slug, data.month, data.year, data.headline, data.publicNotes, data.privateNotes,
      JSON.stringify(data.colors), JSON.stringify(data.colorHexes), data.featuredCharm,
      Number(data.beadedAvailable), Number(data.braidedAvailable), data.quantity,
      data.schoolPriceCents, data.customPriceCents, data.onlinePriceMinCents, data.onlinePriceMaxCents,
      data.releaseDate, data.endDate, data.tiktokUrl, data.etsyUrl, data.status,
      now, data.status, now, id
    ).run();
    await this.log(actor, 'drop.update', 'drop', id, { name: data.name, status: data.status });
    return this.getDrop(id);
  }

  async setDropStatus(id, status, actor) {
    const now = nowIso();
    const result = await this.db.prepare("UPDATE drops SET status=?,updated_at=?,published_at=CASE WHEN ?='published' THEN COALESCE(published_at,?) ELSE published_at END WHERE id=?").bind(status, now, status, now, id).run();
    if (!result.meta.changes) return null;
    await this.log(actor, 'drop.status', 'drop', id, { status });
    return this.getDrop(id);
  }

  async listPhotos({ includePrivate = true } = {}) {
    const sql = includePrivate
      ? 'SELECT * FROM photos ORDER BY created_at DESC'
      : "SELECT * FROM photos WHERE status='approved' AND no_faces_confirmed=1 ORDER BY created_at DESC";
    const { results = [] } = await this.db.prepare(sql).all();
    return results.map(serializePhoto);
  }

  async getPhoto(id) {
    const row = await this.db.prepare('SELECT * FROM photos WHERE id=?').bind(id).first();
    return row ? serializePhoto(row) : null;
  }

  async savePhoto({ meta, variants }, actor) {
    const id = newId('photo');
    const ext = meta.mimeType === 'image/png' ? 'png' : meta.mimeType === 'image/webp' ? 'webp' : 'jpg';
    const originalKey = `originals/${id}.${ext}`;
    const webKey = `web/${id}.webp`;
    const thumbKey = `thumbs/${id}.webp`;
    await Promise.all([
      this.media.put(originalKey, variants.original, { httpMetadata: { contentType: meta.mimeType } }),
      this.media.put(webKey, variants.web, { httpMetadata: { contentType: 'image/webp' } }),
      this.media.put(thumbKey, variants.thumb, { httpMetadata: { contentType: 'image/webp' } })
    ]);
    const now = nowIso();
    await this.db.prepare('INSERT INTO photos(id,original_key,web_key,thumb_key,original_name,mime_type,size_bytes,alt_text,caption,no_faces_confirmed,status,uploaded_by,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(
      id, originalKey, webKey, thumbKey, meta.originalName, meta.mimeType, variants.original.length,
      meta.altText, meta.caption, Number(meta.noFacesConfirmed), 'pending', actor.username, now
    ).run();
    await this.log(actor, 'photo.upload', 'photo', id, { name: meta.originalName });
    return this.getPhoto(id);
  }

  async approvePhoto(id, decision, actor) {
    const status = decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'archived';
    const now = nowIso();
    const result = await this.db.prepare('UPDATE photos SET status=?,approved_by=?,approved_at=? WHERE id=?').bind(status, actor.username, now, id).run();
    if (!result.meta.changes) return null;
    await this.log(actor, `photo.${status}`, 'photo', id, {});
    return this.getPhoto(id);
  }

  async attachPhoto(dropId, photoId, { isCover = false } = {}, actor) {
    if (isCover) await this.db.prepare('UPDATE drop_photos SET is_cover=0 WHERE drop_id=?').bind(dropId).run();
    await this.db.prepare('INSERT INTO drop_photos(drop_id,photo_id,position,is_cover) VALUES(?,?,COALESCE((SELECT MAX(position)+1 FROM drop_photos WHERE drop_id=?),0),?) ON CONFLICT(drop_id,photo_id) DO UPDATE SET is_cover=excluded.is_cover').bind(dropId, photoId, dropId, Number(isCover)).run();
    await this.log(actor, 'drop.photo.attach', 'drop', dropId, { photoId, isCover });
    return this.getDrop(dropId);
  }

  async getMedia(key) {
    const object = await this.media.get(key);
    if (!object) return null;
    return {
      bytes: new Uint8Array(await object.arrayBuffer()),
      type: object.httpMetadata?.contentType || 'application/octet-stream'
    };
  }

  async createOrder(data) {
    const id = newId('order');
    const now = nowIso();
    const options = data.productOptions || {};
    await this.db.prepare(`INSERT INTO orders(
      id,first_name,contact_email,bracelet_style,quantity,colors_json,charm,name_word,size,needed_by,gift_packaging,notes,estimated_cents,status,created_at,updated_at,
      product_type,order_type,product_options_json,fulfillment_method,shipping_address_json,estimate_complete,estimate_note,payment_status,payment_method,amount_paid_cents,paid_at,payment_note
    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
      id, data.firstName, data.contactEmail, options.braceletStyle || '', data.quantity,
      JSON.stringify(options.colors || []), options.charm || '', options.nameWord || '', options.size || 'standard',
      data.neededBy, Number(Boolean(options.giftPackaging)), data.notes, data.estimatedCents, 'new', now, now,
      data.productType, data.orderType, JSON.stringify(options), data.fulfillmentMethod,
      JSON.stringify(data.shippingAddress || {}), Number(data.estimateComplete), data.estimateNote,
      'unpaid', '', 0, null, ''
    ).run();
    await this.log({ username: 'public', role: 'public' }, 'order.create', 'order', id, {
      productType: data.productType,
      quantity: data.quantity,
      fulfillmentMethod: data.fulfillmentMethod
    });
    const row = await this.db.prepare('SELECT * FROM orders WHERE id=?').bind(id).first();
    return serializeOrder(row, { includePrivate: false });
  }

  async getOrder(id, { includePrivate = true } = {}) {
    const row = await this.db.prepare('SELECT * FROM orders WHERE id=?').bind(id).first();
    return row ? serializeOrder(row, { includePrivate }) : null;
  }

  async listOrders({ includePrivate = false } = {}) {
    const { results = [] } = await this.db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
    return results.map(row => serializeOrder(row, { includePrivate }));
  }

  async updateOrderStatus(id, status, actor) {
    const now = nowIso();
    const result = await this.db.prepare('UPDATE orders SET status=?,updated_at=? WHERE id=?').bind(status, now, id).run();
    if (!result.meta.changes) return null;
    await this.log(actor, 'order.status', 'order', id, { status });
    return this.getOrder(id, { includePrivate: true });
  }

  async updateOrderPayment(id, payment, actor) {
    const now = nowIso();
    const paidAt = payment.paymentStatus === 'received' ? (payment.paidAt || now) : null;
    const result = await this.db.prepare('UPDATE orders SET payment_status=?,payment_method=?,amount_paid_cents=?,paid_at=?,payment_note=?,updated_at=? WHERE id=?').bind(
      payment.paymentStatus, payment.paymentMethod, payment.amountPaidCents, paidAt, payment.paymentNote, now, id
    ).run();
    if (!result.meta.changes) return null;
    await this.log(actor, 'order.payment', 'order', id, {
      paymentStatus: payment.paymentStatus,
      paymentMethod: payment.paymentMethod,
      amountPaidCents: payment.amountPaidCents
    });
    return this.getOrder(id, { includePrivate: true });
  }

  async listActivity(limit = 100) {
    const { results = [] } = await this.db.prepare('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ?').bind(limit).all();
    return results.map(row => ({ ...row, details: JSON.parse(row.details_json || '{}') }));
  }

  async log(actor, action, type, id, details = {}) {
    await this.db.prepare('INSERT INTO activity_log(id,actor,role,action,entity_type,entity_id,details_json,created_at) VALUES(?,?,?,?,?,?,?,?)').bind(
      newId('act'), actor.username || 'system', actor.role || 'system', action, type, id || '', JSON.stringify(details), nowIso()
    ).run();
  }

  async checkLoginLimit(key) {
    const row = await this.db.prepare('SELECT * FROM login_attempts WHERE client_key=?').bind(key).first();
    if (!row?.locked_until) return { allowed: true };
    const lockTime = Date.parse(row.locked_until);
    return lockTime > Date.now()
      ? { allowed: false, retryAfter: Math.ceil((lockTime - Date.now()) / 1000) }
      : { allowed: true };
  }

  async recordLogin(key, success) {
    if (success) {
      await this.db.prepare('DELETE FROM login_attempts WHERE client_key=?').bind(key).run();
      return;
    }
    const current = await this.db.prepare('SELECT * FROM login_attempts WHERE client_key=?').bind(key).first();
    const failed = (current?.failed_count || 0) + 1;
    const now = nowIso();
    const lockedUntil = failed >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;
    await this.db.prepare('INSERT INTO login_attempts(client_key,failed_count,first_failed_at,locked_until,last_attempt_at) VALUES(?,?,?,?,?) ON CONFLICT(client_key) DO UPDATE SET failed_count=excluded.failed_count,locked_until=excluded.locked_until,last_attempt_at=excluded.last_attempt_at').bind(
      key, failed, current?.first_failed_at || now, lockedUntil, now
    ).run();
  }
}
