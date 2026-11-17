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

test('shutdown forces connections closed at deadline and closes pool only once', async () => {
  let forcedClose = false;
  let closeCallback: ((error?: Error) => void) | undefined;
  let poolEndCount = 0;
  const server = {
    close(callback: (error?: Error) => void) {
      closeCallback = callback;
    },
    closeAllConnections() {
      forcedClose = true;
    },
  };
  const pool = {
    async end() {
      poolEndCount += 1;
    },
  };

  await assert.rejects(
    shutdownGracefully(server, pool, 5),
    /deadline exceeded/i,
  );
  assert.equal(forcedClose, true);

  // A late server callback must not initiate a second pool shutdown.
  closeCallback?.();
  assert.equal(poolEndCount, 1);
});
