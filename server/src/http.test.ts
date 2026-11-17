import assert from 'node:assert/strict';
import test from 'node:test';
import { bodyParserErrorResponse } from './http';

test('bodyParserErrorResponse maps malformed JSON to a safe 400 response', () => {
  assert.deepEqual(
    bodyParserErrorResponse({
      type: 'entity.parse.failed',
      message: 'Unexpected token at private request body',
    }),
    {
      status: 400,
      code: 'invalid_json',
      message: 'O corpo da requisição contém JSON inválido.',
    },
  );
});

test('bodyParserErrorResponse maps oversized payloads to 413', () => {
  assert.deepEqual(
    bodyParserErrorResponse({ type: 'entity.too.large' }),
    {
      status: 413,
      code: 'payload_too_large',
      message: 'O corpo da requisição excede o tamanho permitido.',
    },
  );
});

test('bodyParserErrorResponse ignores unrelated errors', () => {
  assert.equal(bodyParserErrorResponse(new Error('database unavailable')), null);
  assert.equal(bodyParserErrorResponse({ type: 'entity.verify.failed' }), null);
  assert.equal(bodyParserErrorResponse(null), null);
});
