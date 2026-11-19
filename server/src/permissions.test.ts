import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTIONS,
  ROLE_LEVELS,
  allowedActions,
  assertAction,
  can,
} from './permissions';

test('role levels increase from member to system administrator', () => {
  assert.deepEqual(ROLE_LEVELS, {
    member: 1,
    sector_lead: 2,
    studio_lead: 3,
    senior_lead: 4,
    sysadmin: 5,
  });
});

test('permission checks enforce the configured minimum level', () => {
  assert.equal(can(1, 'events.view'), true);
  assert.equal(can(1, 'events.create'), false);
  assert.equal(can(1, 'reports.edit'), false);
  assert.equal(can(2, 'reports.edit'), true);
  assert.equal(can(1, 'errors.edit'), false);
  assert.equal(can(2, 'errors.edit'), true);
  assert.equal(can(3, 'production.manage'), true);
  assert.equal(can(2, 'production.manage'), false);
  assert.equal(can(4, 'users.manage'), false);
  assert.equal(can(5, 'users.manage'), true);
});

test('allowedActions returns only actions available at the supplied level', () => {
  const memberActions = allowedActions(1);
  const adminActions = allowedActions(5);

  assert.ok(memberActions.includes('events.view'));
  assert.ok(!memberActions.includes('events.create'));
  assert.equal(adminActions.length, Object.keys(ACTIONS).length);
});

test('assertAction throws a forbidden error when level is insufficient', () => {
  assert.throws(
    () => assertAction(1, 'users.manage'),
    (error: any) => error.status === 403 && error.code === 'forbidden',
  );
  assert.doesNotThrow(() => assertAction(5, 'users.manage'));
});
