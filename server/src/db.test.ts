import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import { releaseDb } from './db';

function setup() {
  const calls: string[] = [];
  const client = {
    query: async (sql: string) => {
      calls.push(sql);
      return { rows: [] };
    },
    release: (error?: Error) => {
      calls.push(error ? 'release:error' : 'release:ok');
    },
  };
  const response = new EventEmitter() as EventEmitter & {
    writableFinished: boolean;
  };
  response.writableFinished = false;
  let nextCalled = false;
  releaseDb({ db: client }, response, () => {
    nextCalled = true;
  });
  return { calls, client, response, nextCalled: () => nextCalled };
}

test('releaseDb rolls back and clears actor context after a finished response', async () => {
  const state = setup();
  assert.equal(state.nextCalled(), true);

  state.response.writableFinished = true;
  state.response.emit('finish');
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(state.calls, [
    'rollback',
    `select set_config('mmv.actor_id', '', false),
                set_config('mmv.actor_level', '', false)`,
    'release:ok',
  ]);
});

test('releaseDb destroys a connection when the response closes prematurely', () => {
  const state = setup();
  state.response.writableFinished = false;
  state.response.emit('close');

  assert.equal(state.calls.length, 1);
  assert.equal(state.calls[0], 'release:error');
});

test('releaseDb does not release a connection twice after finish and close', async () => {
  const state = setup();
  state.response.writableFinished = true;
  state.response.emit('finish');
  state.response.emit('close');
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(state.calls.filter((call) => call.startsWith('release:')).length, 1);
});
