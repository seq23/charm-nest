import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_SETTINGS } from '../core/constants.mjs';
import { mergeSettings, newId, nowIso, serializeDrop, serializeOrder, serializePhoto } from '../core/store-utils.mjs';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dirname, '../..');

function ensureDir(filePath) { fs.mkdirSync(path.dirname(filePath), { recursive: true }); }

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
    const migration = fs.readFileSync(path.join(root, 'migrations/0001_init.sql'), 'utf8');
    this.db.exec(migration);
    const now = nowIso();
    const insert = this.db.prepare('INSERT OR IGNORE INTO settings(key,value,updated_at) VALUES(?,?,?)');
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) insert.run(key, String(value), now);
  }

  getSettings() { return mergeSettings(this.db.prepare('SELECT key,value FROM settings').all()); }

  updateSettings(patch, actor) {
    const now = nowIso();
    const upsert = this.db.prepare('INSERT INTO settings(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at');
    const tx = this.db.transaction(values => { for (const [key, value] of Object.entries(values)) upsert.run(key, String(value), now); });
    tx(patch);
    this.log(actor, 'settings.update', 'settings', '', patch);
    return this.getSettings();
  }

  listDrops({ includePrivate = false } = {}) {
    const rows = this.db.prepare(includePrivate ? 'SELECT * FROM drops ORDER BY updated_at DESC' : "SELECT * FROM drops WHERE status IN ('published','sold-out') ORDER BY published_at DESC, updated_at DESC").all();
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
      id,data.name,data.slug,data.month,data.year,data.headline,data.publicNotes,data.privateNotes,JSON.stringify(data.colors),JSON.stringify(data.colorHexes),data.featuredCharm,Number(data.beadedAvailable),Number(data.braidedAvailable),data.quantity,data.schoolPriceCents,data.customPriceCents,data.onlinePriceMinCents,data.onlinePriceMaxCents,data.releaseDate,data.endDate,data.tiktokUrl,data.etsyUrl,data.status,actor.username,now,now,data.status==='published'?now:null
    );
    this.log(actor,'drop.create','drop',id,{name:data.name,status:data.status});
    return this.getDrop(id);
  }

  updateDrop(id, data, actor) {
    const existing = this.getDrop(id);
    if (!existing) return null;
    const now = nowIso();
    this.db.prepare(`UPDATE drops SET name=?,slug=?,month=?,year=?,headline=?,public_notes=?,private_notes=?,colors_json=?,color_hexes_json=?,featured_charm=?,beaded_available=?,braided_available=?,quantity=?,school_price_cents=?,custom_price_cents=?,online_price_min_cents=?,online_price_max_cents=?,release_date=?,end_date=?,tiktok_url=?,etsy_url=?,status=?,updated_at=?,published_at=CASE WHEN ?='published' AND published_at IS NULL THEN ? ELSE published_at END WHERE id=?`).run(
      data.name,data.slug,data.month,data.year,data.headline,data.publicNotes,data.privateNotes,JSON.stringify(data.colors),JSON.stringify(data.colorHexes),data.featuredCharm,Number(data.beadedAvailable),Number(data.braidedAvailable),data.quantity,data.schoolPriceCents,data.customPriceCents,data.onlinePriceMinCents,data.onlinePriceMaxCents,data.releaseDate,data.endDate,data.tiktokUrl,data.etsyUrl,data.status,now,data.status,now,id
    );
    this.log(actor,'drop.update','drop',id,{name:data.name,status:data.status});
    return this.getDrop(id);
  }

  setDropStatus(id,status,actor) {
    const now=nowIso();
    const result=this.db.prepare("UPDATE drops SET status=?,updated_at=?,published_at=CASE WHEN ?='published' THEN COALESCE(published_at,?) ELSE published_at END WHERE id=?").run(status,now,status,now,id);
    if (!result.changes) return null;
    this.log(actor,'drop.status','drop',id,{status});
    return this.getDrop(id);
  }

  listPhotos({ includePrivate = true } = {}) {
    const rows=this.db.prepare(includePrivate?'SELECT * FROM photos ORDER BY created_at DESC':"SELECT * FROM photos WHERE status='approved' AND no_faces_confirmed=1 ORDER BY created_at DESC").all();
    return rows.map(serializePhoto);
  }

  getPhoto(id) { const row=this.db.prepare('SELECT * FROM photos WHERE id=?').get(id); return row?serializePhoto(row):null; }

  savePhoto({ meta, variants }, actor) {
    const id=newId('photo');
    const ext = meta.mimeType==='image/png'?'png':meta.mimeType==='image/webp'?'webp':'jpg';
    const originalKey=`originals/${id}.${ext}`;
    const webKey=`web/${id}.webp`;
    const thumbKey=`thumbs/${id}.webp`;
    for (const [key, payload] of [[originalKey,variants.original],[webKey,variants.web],[thumbKey,variants.thumb]]) {
      const filePath=path.join(this.uploadsDir,key); ensureDir(filePath); fs.writeFileSync(filePath,payload);
    }
    const now=nowIso();
    this.db.prepare('INSERT INTO photos(id,original_key,web_key,thumb_key,original_name,mime_type,size_bytes,alt_text,caption,no_faces_confirmed,status,uploaded_by,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,originalKey,webKey,thumbKey,meta.originalName,meta.mimeType,variants.original.length,meta.altText,meta.caption,Number(meta.noFacesConfirmed),'pending',actor.username,now);
    this.log(actor,'photo.upload','photo',id,{name:meta.originalName});
    return this.getPhoto(id);
  }

  approvePhoto(id, decision, actor) {
    const status=decision==='approve'?'approved':decision==='reject'?'rejected':'archived';
    const now=nowIso();
    const result=this.db.prepare('UPDATE photos SET status=?,approved_by=?,approved_at=? WHERE id=?').run(status,actor.username,now,id);
    if (!result.changes) return null;
    this.log(actor,`photo.${status}`,'photo',id,{});
    return this.getPhoto(id);
  }

  attachPhoto(dropId, photoId, { isCover=false } = {}, actor) {
    if (isCover) this.db.prepare('UPDATE drop_photos SET is_cover=0 WHERE drop_id=?').run(dropId);
    this.db.prepare('INSERT INTO drop_photos(drop_id,photo_id,position,is_cover) VALUES(?,?,COALESCE((SELECT MAX(position)+1 FROM drop_photos WHERE drop_id=?),0),?) ON CONFLICT(drop_id,photo_id) DO UPDATE SET is_cover=excluded.is_cover').run(dropId,photoId,dropId,Number(isCover));
    this.log(actor,'drop.photo.attach','drop',dropId,{photoId,isCover});
    return this.getDrop(dropId);
  }

  photosForDrop(dropId, includePrivate) {
    const sql=`SELECT p.*,dp.position,dp.is_cover FROM photos p JOIN drop_photos dp ON dp.photo_id=p.id WHERE dp.drop_id=? ${includePrivate?'':"AND p.status='approved' AND p.no_faces_confirmed=1"} ORDER BY dp.is_cover DESC,dp.position ASC`;
    return this.db.prepare(sql).all(dropId).map(row=>({...serializePhoto(row),isCover:Boolean(row.is_cover),position:row.position}));
  }

  getMedia(key) {
    const safe=String(key).replaceAll('..','');
    const filePath=path.join(this.uploadsDir,safe);
    if (!filePath.startsWith(this.uploadsDir) || !fs.existsSync(filePath)) return null;
    return { bytes:fs.readFileSync(filePath), type:safe.endsWith('.webp')?'image/webp':safe.endsWith('.png')?'image/png':'image/jpeg' };
  }

  createOrder(data) {
    const id=newId('order'); const now=nowIso();
    this.db.prepare('INSERT INTO orders(id,first_name,contact_email,bracelet_style,quantity,colors_json,charm,name_word,size,needed_by,gift_packaging,notes,estimated_cents,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,data.firstName,data.contactEmail,data.braceletStyle,data.quantity,JSON.stringify(data.colors),data.charm,data.nameWord,data.size,data.neededBy,Number(data.giftPackaging),data.notes,data.estimatedCents,'new',now,now);
    this.log({username:'public',role:'public'},'order.create','order',id,{style:data.braceletStyle,quantity:data.quantity});
    return serializeOrder(this.db.prepare('SELECT * FROM orders WHERE id=?').get(id),false);
  }

  listOrders({ includeEmail = false } = {}) { return this.db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all().map(row=>serializeOrder(row,includeEmail)); }

  updateOrderStatus(id,status,actor) {
    const now=nowIso(); const result=this.db.prepare('UPDATE orders SET status=?,updated_at=? WHERE id=?').run(status,now,id);
    if (!result.changes) return null;
    this.log(actor,'order.status','order',id,{status});
    return serializeOrder(this.db.prepare('SELECT * FROM orders WHERE id=?').get(id),true);
  }

  listActivity(limit=100) { return this.db.prepare('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ?').all(limit).map(row=>({...row,details:JSON.parse(row.details_json||'{}')})); }

  log(actor,action,entityType,entityId,details={}) {
    this.db.prepare('INSERT INTO activity_log(id,actor,role,action,entity_type,entity_id,details_json,created_at) VALUES(?,?,?,?,?,?,?,?)').run(newId('act'),actor.username||'system',actor.role||'system',action,entityType,entityId||'',JSON.stringify(details),nowIso());
  }

  checkLoginLimit(clientKey) {
    const row=this.db.prepare('SELECT * FROM login_attempts WHERE client_key=?').get(clientKey);
    if (!row?.locked_until) return { allowed:true };
    const lockedUntil=Date.parse(row.locked_until);
    if (Number.isFinite(lockedUntil) && lockedUntil>Date.now()) return {allowed:false,retryAfter:Math.ceil((lockedUntil-Date.now())/1000)};
    return {allowed:true};
  }

  recordLogin(clientKey, success) {
    const now=nowIso();
    if (success) { this.db.prepare('DELETE FROM login_attempts WHERE client_key=?').run(clientKey); return; }
    const current=this.db.prepare('SELECT * FROM login_attempts WHERE client_key=?').get(clientKey);
    const failed=(current?.failed_count||0)+1;
    const lock=failed>=5?new Date(Date.now()+15*60*1000).toISOString():null;
    this.db.prepare('INSERT INTO login_attempts(client_key,failed_count,first_failed_at,locked_until,last_attempt_at) VALUES(?,?,?,?,?) ON CONFLICT(client_key) DO UPDATE SET failed_count=excluded.failed_count,locked_until=excluded.locked_until,last_attempt_at=excluded.last_attempt_at').run(clientKey,failed,current?.first_failed_at||now,lock,now);
  }
}
