import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import { logApiError, requestObservability } from './observability';

test('requestObservability adds a request id and logs safe request metadata', () => {
  const response = new EventEmitter() as EventEmitter & {
    statusCode: number;
    headers: Record<string, string>;
    setHeader: (name: string, value: string) => void;
  };
  response.statusCode = 204;
  response.headers = {};
  response.setHeader = (name, value) => {
    response.headers[name] = value;
  };

  const request: any = { method: 'GET', path: '/api/health', query: { token: 'secret' } };
  let nextCalled = false;
  const originalLog = console.log;
  const logs: string[] = [];
  console.log = (message?: unknown) => logs.push(String(message));

  try {
    requestObservability(request, response, () => {
      nextCalled = true;
    });
    response.emit('finish');
  } finally {
    console.log = originalLog;
  }

  assert.equal(nextCalled, true);
  assert.match(request.requestId, /^[0-9a-f-]{36}$/i);
  assert.equal(response.headers['x-request-id'], request.requestId);
  assert.equal(logs.length, 1);

  const entry = JSON.parse(logs[0]);
  assert.equal(entry.event, 'http.request');
  assert.equal(entry.request_id, request.requestId);
  assert.equal(entry.method, 'GET');
  assert.equal(entry.path, '/api/health');
  assert.equal(entry.status, 204);
  assert.equal(JSON.stringify(entry).includes('secret'), false);
  assert.equal('query' in entry, false);
});

test('logApiError records correlation metadata without serializing the error', () => {
  const originalError = console.error;
  const logs: string[] = [];
  console.error = (message?: unknown) => logs.push(String(message));

  try {
    logApiError(
      { requestId: 'request-123', method: 'POST', path: '/api/auth/login' },
      new Error('sensitive database detail'),
    );
  } finally {
    console.error = originalError;
  }

  assert.equal(logs.length, 1);
  const entry = JSON.parse(logs[0]);
  assert.equal(entry.event, 'api.unhandled_error');
  assert.equal(entry.request_id, 'request-123');
  assert.equal(entry.error_name, 'Error');
  assert.equal(logs[0].includes('sensitive database detail'), false);
});
