import assert from 'node:assert/strict';
import test from 'node:test';
import { buildUserUpdateQuery } from './userUpdate';

test('buildUserUpdateQuery creates parameterized assignments and values', () => {
  assert.deepEqual(
    buildUserUpdateQuery(
      { full_name: 'Nome atualizado', email: 'novo@example.com', status: 'active' },
      'user-123',
    ),
    {
      text: 'update users set full_name = $1, email = $2, status = $3, updated_at = now() where id = $4',
      values: ['Nome atualizado', 'novo@example.com', 'active', 'user-123'],
    },
  );
});

test('buildUserUpdateQuery ignores unsupported keys and returns null for empty patches', () => {
  assert.deepEqual(
    buildUserUpdateQuery(
      { status: 'inactive', unsafe_column: 'ignored' },
      'user-123',
    ),
    {
      text: 'update users set status = $1, updated_at = now() where id = $2',
      values: ['inactive', 'user-123'],
    },
  );
  assert.equal(buildUserUpdateQuery({}, 'user-123'), null);
});
