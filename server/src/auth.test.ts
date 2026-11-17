import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from './auth';

test('password hash verifies the original password', () => {
  const password = 'Senha-forte-123!';
  const hash = hashPassword(password);

  assert.notEqual(hash, password);
  assert.match(hash, /^scrypt\$[a-f0-9]+\$[a-f0-9]+$/);
  assert.equal(verifyPassword(password, hash), true);
});

test('password hash rejects a different password', () => {
  const hash = hashPassword('Senha-forte-123!');

  assert.equal(verifyPassword('Senha-incorreta-456!', hash), false);
});

test('password verification rejects malformed hashes', () => {
  assert.equal(verifyPassword('qualquer', ''), false);
  assert.equal(verifyPassword('qualquer', 'bcrypt$invalid$hash'), false);
});
