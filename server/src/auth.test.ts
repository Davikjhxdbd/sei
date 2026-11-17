import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from './auth';

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
