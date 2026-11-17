import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  createSession,
  hashPassword,
  hashSessionToken,
  verifyPassword,
} from './auth';

test('password hash verifies the original password', async () => {
  const password = 'Senha-forte-123!';
  const hash = await hashPassword(password);

  assert.notEqual(hash, password);
  assert.match(hash, /^scrypt\$[a-f0-9]+\$[a-f0-9]+$/);
  assert.equal(await verifyPassword(password, hash), true);
});

test('password hash rejects a different password', async () => {
  const hash = await hashPassword('Senha-forte-123!');

  assert.equal(await verifyPassword('Senha-incorreta-456!', hash), false);
});

test('password verification rejects malformed hashes', async () => {
  assert.equal(await verifyPassword('qualquer', ''), false);
  assert.equal(await verifyPassword('qualquer', 'bcrypt$invalid$hash'), false);
});

test('session token hashes are deterministic and do not expose the token', () => {
  const token = 'opaque-session-token';
  const hash = hashSessionToken(token);

  assert.equal(hash, crypto.createHash('sha256').update(token).digest('hex'));
  assert.notEqual(hash, token);
  assert.equal(hashSessionToken(token), hash);
});

test('new sessions store only a hash and return the raw cookie token', async () => {
  let insertedToken = '';
  const db = {
    query: async (sql: string, values: unknown[] = []) => {
      if (sql.includes('insert into sessions')) {
        insertedToken = String(values[0]);
      }
      return { rows: [] };
    },
  };

  const session = await createSession(db as any, 'user-id', 'test-agent');

  assert.equal(insertedToken, hashSessionToken(session.token));
  assert.notEqual(insertedToken, session.token);
  assert.equal(insertedToken.length, 64);
});
