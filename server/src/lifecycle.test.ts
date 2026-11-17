import test from 'node:test';
import assert from 'node:assert/strict';
import { shutdownGracefully } from './lifecycle';

test('shutdown closes HTTP server before PostgreSQL pool', async () => {
  const calls: string[] = [];
  const server = {
    close(callback: (error?: Error) => void) {
      calls.push('server.close');
      callback();
    },
    closeAllConnections() {
      calls.push('server.closeAllConnections');
    },
  };
  const pool = {
    async end() {
      calls.push('pool.end');
    },
  };

  await shutdownGracefully(server, pool);

  assert.deepEqual(calls, ['server.close', 'pool.end']);
});

test('shutdown rejects when the HTTP server cannot close before deadline', async () => {
  let forcedClose = false;
  const server = {
    close(_callback: (error?: Error) => void) {
      // Simulate a server whose close callback never arrives.
    },
    closeAllConnections() {
      forcedClose = true;
    },
  };
  const pool = {
    async end() {
      throw new Error('Pool must not close while HTTP requests are still active.');
    },
  };

  await assert.rejects(
    shutdownGracefully(server, pool, 5),
    /deadline exceeded/i,
  );
  assert.equal(forcedClose, true);
});
