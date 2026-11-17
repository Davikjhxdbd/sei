import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import { clearRateLimit, consumeRateLimit, rateLimitBucket } from './rateLimit';

test('rate limit buckets are deterministic, scoped, and do not expose identifiers', () => {
  const identifier = 'person@example.com';
  const loginBucket = rateLimitBucket('login', identifier);

  assert.match(loginBucket, /^[a-f0-9]{64}$/);
  assert.equal(
    loginBucket,
    crypto.createHash('sha256').update(`login:${identifier}`).digest('hex'),
  );
  assert.equal(rateLimitBucket('login', identifier), loginBucket);
  assert.notEqual(rateLimitBucket('recovery', identifier), loginBucket);
  assert.equal(loginBucket.includes(identifier), false);
});

test('consumeRateLimit cleans expired buckets and atomically consumes one attempt', async () => {
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  const db = {
    query: async (sql: string, values: unknown[] = []) => {
      calls.push({ sql, values });
      if (sql.includes('returning attempts')) {
        return { rows: [{ attempts: '3' }] };
      }
      return { rows: [] };
    },
  };

  const attempts = await consumeRateLimit(db as any, 'a'.repeat(64), 600_000);

  assert.equal(attempts, 3);
  assert.equal(calls.length, 2);
  assert.match(calls[0].sql, /delete from auth_rate_limits/);
  assert.match(calls[1].sql, /insert into auth_rate_limits/);
  assert.match(calls[1].sql, /on conflict \(bucket_hash\) do update/);
  assert.deepEqual(calls[1].values, ['a'.repeat(64), 600_000]);
});

test('consumeRateLimit returns zero when the database returns no row', async () => {
  const db = {
    query: async () => ({ rows: [] }),
  };

  assert.equal(await consumeRateLimit(db as any, 'b'.repeat(64), 60_000), 0);
});

test('clearRateLimit deletes only the requested hashed bucket', async () => {
  let call: { sql: string; values: unknown[] } | undefined;
  const db = {
    query: async (sql: string, values: unknown[] = []) => {
      call = { sql, values };
      return { rows: [] };
    },
  };

  await clearRateLimit(db as any, 'c'.repeat(64));

  assert.equal(call?.sql, 'delete from auth_rate_limits where bucket_hash = $1');
  assert.deepEqual(call?.values, ['c'.repeat(64)]);
});

import { loginRateLimitBuckets } from './rateLimit';

test('login rate limit buckets isolate account and network dimensions', () => {
  const first = loginRateLimitBuckets('Person@Example.com', '203.0.113.10');
  const normalized = loginRateLimitBuckets(' person@example.com ', '203.0.113.10');
  const otherAccount = loginRateLimitBuckets('other@example.com', '203.0.113.10');
  const otherNetwork = loginRateLimitBuckets('person@example.com', '203.0.113.11');

  assert.equal(first.account, normalized.account);
  assert.equal(first.network, normalized.network);
  assert.notEqual(first.account, otherAccount.account);
  assert.equal(first.network, otherAccount.network);
  assert.equal(first.account, otherNetwork.account);
  assert.notEqual(first.network, otherNetwork.network);
  assert.equal(first.account.includes('person@example.com'), false);
});
