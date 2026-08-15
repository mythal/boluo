import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccessPolicy } from '@boluo/api';
import { canEditCharacter } from './character-permissions';

const canEdit = (
  accessPolicy: AccessPolicy,
  overrides: Partial<Parameters<typeof canEditCharacter>[0]> = {},
): boolean =>
  canEditCharacter({
    accessPolicy,
    ownerId: 'owner',
    userId: 'member',
    isResourceMember: true,
    isGameMaster: false,
    canManageSpace: false,
    ...overrides,
  });

test('matches server character edit access rules', () => {
  assert.equal(canEdit('PUBLIC'), false);
  assert.equal(canEdit('PUBLIC', { isGameMaster: true }), true);
  assert.equal(canEdit('COLLABORATIVE'), true);
  assert.equal(canEdit('PERSONAL', { userId: 'owner' }), true);
  assert.equal(canEdit('PERSONAL', { userId: 'owner', isResourceMember: false }), false);
  assert.equal(canEdit('SECRET', { isGameMaster: true }), true);
  assert.equal(canEdit('GAME_MASTER'), false);
  assert.equal(canEdit('GAME_MASTER', { isGameMaster: true }), true);
  assert.equal(canEdit('PUBLIC', { canManageSpace: true, isResourceMember: false }), true);
  assert.equal(canEdit('COLLABORATIVE', { userId: null }), false);
});

test('target access policy may be stricter than current edit access', () => {
  const access = {
    ownerId: 'owner',
    userId: 'member',
    isResourceMember: true,
    isGameMaster: false,
    canManageSpace: false,
  };

  assert.equal(canEditCharacter({ ...access, accessPolicy: 'COLLABORATIVE' }), true);
  assert.equal(canEditCharacter({ ...access, accessPolicy: 'PUBLIC' }), false);
  assert.equal(canEditCharacter({ ...access, accessPolicy: 'PERSONAL' }), false);
  assert.equal(canEditCharacter({ ...access, accessPolicy: 'SECRET' }), false);
  assert.equal(canEditCharacter({ ...access, accessPolicy: 'GAME_MASTER' }), false);
});
