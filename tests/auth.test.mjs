import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, createSession, verifySession } from '../src/core/auth.mjs';

test('password hashes verify and reject wrong passwords', async () => {
  const hash = await hashPassword('maker-password-123');
  assert.equal(await verifyPassword('maker-password-123', hash), true);
  assert.equal(await verifyPassword('wrong-password', hash), false);
});

test('signed Maker sessions preserve role and reject tampering', async () => {
  const secret = '0123456789abcdef0123456789abcdef';
  const { token } = await createSession({ username: 'maker', role: 'maker', secret });
  const session = await verifySession(token, secret);
  assert.equal(session.role, 'maker');
  assert.equal(await verifySession(`${token}x`, secret), null);
});

test('signed Adult sessions are rejected by the unified Maker runtime', async () => {
  const secret = '0123456789abcdef0123456789abcdef';
  const { token } = await createSession({ username: 'adult', role: 'adult', secret });
  assert.equal(await verifySession(token, secret), null);
});

