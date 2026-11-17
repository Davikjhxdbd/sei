import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  createSession,
  hashPassword,
  hashSessionToken,
  parseLoginCredentials,
  requireAuth,
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


test('requireAuth clears the cookie when the account is no longer active', async () => {
  const queries: string[] = [];
  const db = {
    query: async (sql: string) => {
      queries.push(sql);
      if (sql.includes('select user_id from sessions')) {
        return { rows: [{ user_id: 'user-1' }] };
      }
      if (sql.includes('from users u')) {
        return {
          rows: [{
            id: 'user-1',
            full_name: 'Pessoa',
            username: 'pessoa',
            email: null,
            status: 'suspended',
            created_at: new Date().toISOString(),
            last_login_at: null,
            roles: [],
          }],
        };
      }
      if (sql.includes('from user_sectors')) return { rows: [] };
      throw new Error('Consulta inesperada no teste de autenticação');
    },
  };
  let clearedCookie = false;
  const req = {
    cookies: { mmv_session: 'raw-session-token' },
    db,
  };
  const res = {
    clearCookie: (name: string) => {
      assert.equal(name, 'mmv_session');
      clearedCookie = true;
    },
  };

  const error = await new Promise<any>((resolve) => {
    requireAuth(req as any, res as any, (nextError?: any) => resolve(nextError));
  });

  assert.equal(clearedCookie, true);
  assert.equal(error?.code, 'account_inactive');
  assert.equal(queries.length, 3);
});

test('login credentials reject missing, malformed and oversized input', () => {
  assert.equal(parseLoginCredentials(null), null);
  assert.equal(parseLoginCredentials({ username: 'user' }), null);
  assert.equal(parseLoginCredentials({ username: ' ', password: 'pass' }), null);
  assert.equal(parseLoginCredentials({ username: 'u'.repeat(161), password: 'pass' }), null);
  assert.equal(parseLoginCredentials({ username: 'user', password: 'p'.repeat(129) }), null);
  assert.equal(parseLoginCredentials({ username: 123, password: 'pass' }), null);
});

test('login credentials trim username and preserve password exactly', () => {
  assert.deepEqual(
    parseLoginCredentials({ username: '  pessoa  ', password: ' senha com espaço ' }),
    { username: 'pessoa', password: ' senha com espaço ' },
  );
});
