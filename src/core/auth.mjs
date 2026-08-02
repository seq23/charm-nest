const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function base64UrlToBytes(value) {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let index = 0; index < a.length; index += 1) result |= a[index] ^ b[index];
  return result === 0;
}

async function derivePassword(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

export async function hashPassword(password, iterations = 210000) {
  if (typeof password !== 'string' || password.length < 10) throw new Error('Password must contain at least 10 characters.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePassword(password, salt, iterations);
  return `pbkdf2$${iterations}$${bytesToBase64Url(salt)}$${bytesToBase64Url(hash)}`;
}

export async function verifyPassword(password, encodedHash) {
  const [scheme, rawIterations, rawSalt, rawHash] = String(encodedHash || '').split('$');
  if (scheme !== 'pbkdf2' || !rawIterations || !rawSalt || !rawHash) return false;
  const iterations = Number(rawIterations);
  if (!Number.isSafeInteger(iterations) || iterations < 100000) return false;
  const expected = base64UrlToBytes(rawHash);
  const actual = await derivePassword(password, base64UrlToBytes(rawSalt), iterations);
  return timingSafeEqual(actual, expected);
}

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(message)));
}

export async function createSession({ username, role, secret, ttlSeconds = 60 * 60 * 8 }) {
  if (!secret || secret.length < 32) throw new Error('SESSION_SECRET must contain at least 32 characters.');
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    username,
    role,
    iat: now,
    exp: now + ttlSeconds,
    csrf: bytesToBase64Url(crypto.getRandomValues(new Uint8Array(18)))
  };
  const encoded = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = bytesToBase64Url(await hmac(secret, encoded));
  return { token: `${encoded}.${signature}`, payload };
}

export async function verifySession(token, secret) {
  try {
    const [encoded, signature] = String(token || '').split('.');
    if (!encoded || !signature || !secret) return null;
    const expected = await hmac(secret, encoded);
    const actual = base64UrlToBytes(signature);
    if (!timingSafeEqual(expected, actual)) return null;
    const payload = JSON.parse(decoder.decode(base64UrlToBytes(encoded)));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (!['maker', 'adult'].includes(payload.role)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function parseCookies(request) {
  const cookieHeader = request.headers.get('cookie') || '';
  return Object.fromEntries(cookieHeader.split(';').map(part => part.trim()).filter(Boolean).map(part => {
    const index = part.indexOf('=');
    return [decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1))];
  }));
}

export function sessionCookie(token, { secure = true, maxAge = 60 * 60 * 8 } = {}) {
  const securePart = secure ? '; Secure' : '';
  return `charmnest_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax${securePart}; Max-Age=${maxAge}`;
}

export function clearSessionCookie({ secure = true } = {}) {
  const securePart = secure ? '; Secure' : '';
  return `charmnest_session=; Path=/; HttpOnly; SameSite=Lax${securePart}; Max-Age=0`;
}
