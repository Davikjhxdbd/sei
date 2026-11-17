import test from 'node:test';
import assert from 'node:assert/strict';
import { securityHeaders } from './security';

function runMiddleware(secure: boolean) {
  const headers = new Map<string, string>();
  let continued = false;
  const req = { secure };
  const res = {
    setHeader(name: string, value: string) {
      headers.set(name.toLowerCase(), value);
    },
  };
  securityHeaders(req as any, res as any, () => {
    continued = true;
  });
  return { headers, continued };
}

test('security headers prevent caching, MIME sniffing and framing', () => {
  const { headers, continued } = runMiddleware(false);
  assert.equal(continued, true);
  assert.equal(headers.get('cache-control'), 'no-store');
  assert.equal(headers.get('pragma'), 'no-cache');
  assert.equal(headers.get('x-content-type-options'), 'nosniff');
  assert.equal(headers.get('x-frame-options'), 'DENY');
  assert.equal(headers.get('referrer-policy'), 'no-referrer');
  assert.equal(headers.get('x-permitted-cross-domain-policies'), 'none');
});

test('HSTS is emitted only for HTTPS requests', () => {
  const http = runMiddleware(false);
  const https = runMiddleware(true);
  assert.equal(http.headers.has('strict-transport-security'), false);
  assert.equal(https.headers.get('strict-transport-security'), 'max-age=31536000');
});
