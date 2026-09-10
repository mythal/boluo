import assert from 'node:assert/strict';
import test from 'node:test';
import type { ComponentRef } from '@boluo/types/bindings';
import { componentRefsMatch } from './ref';

const requested: ComponentRef = {
  scopeId: 'character',
  entryId: null,
  key: 'HP',
  componentType: 'core/counter',
};
const history: ComponentRef = { ...requested, entryId: 'hp-entry', key: 'hp' };

test('new entry references match normalized history keys within the same scope and component', () => {
  assert.ok(componentRefsMatch(requested, history));
  assert.equal(componentRefsMatch(requested, { ...history, scopeId: 'other-character' }), false);
  assert.equal(componentRefsMatch(requested, { ...history, componentType: 'other' }), false);
  assert.equal(componentRefsMatch(requested, { ...history, key: 'mp' }), false);
});

test('existing entry references use identity instead of a matching name', () => {
  assert.ok(
    componentRefsMatch({ ...requested, entryId: history.entryId }, { ...history, key: 'health' }),
  );
  assert.equal(componentRefsMatch({ ...requested, entryId: 'old-hp-entry' }, history), false);
});
