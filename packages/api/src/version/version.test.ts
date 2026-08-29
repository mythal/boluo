import assert from 'node:assert/strict';
import test from 'node:test';
import { findNewVersion, readFrontendVersion } from '../version';

test('readFrontendVersion reads only an explicit frontend version', () => {
  assert.equal(readFrontendVersion({ frontendVersion: 'frontend-sha' }), 'frontend-sha');
  assert.equal(readFrontendVersion({ version: 'backend-sha' }), null);
  assert.equal(readFrontendVersion({ frontendVersion: null }), null);
  assert.equal(readFrontendVersion(null), null);
});

test('findNewVersion fails closed when either version is unavailable', () => {
  assert.equal(findNewVersion(undefined, 'frontend-sha', null), null);
  assert.equal(findNewVersion('current-sha', null, null), null);
  assert.equal(findNewVersion('current-sha', 'frontend-sha', null), 'frontend-sha');
});
