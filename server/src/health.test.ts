import assert from 'node:assert/strict';
import test from 'node:test';
import { databaseReady } from './health';

test('databaseReady runs a bounded lightweight query', async () => {
  let received: unknown;
  const ready = await databaseReady({
    query: async (config) => {
      received = config;
      return { rows: [{ '?column?': 1 }] };
    },
  });

  assert.equal(ready, true);
  assert.deepEqual(received, {
    text: 'select 1',
    query_timeout: 5_000,
  });
});

test('databaseReady reports false when the database query fails', async () => {
  const ready = await databaseReady({
    query: async () => {
      throw new Error('private database detail');
    },
  });

  assert.equal(ready, false);
});

test('databaseReady respects a configured timeout', async () => {
  let receivedTimeout = 0;
  await databaseReady({
    query: async (config) => {
      receivedTimeout = config.query_timeout;
    },
  }, 1_500);

  assert.equal(receivedTimeout, 1_500);
});
