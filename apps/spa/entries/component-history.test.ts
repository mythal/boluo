import assert from 'node:assert/strict';
import test from 'node:test';
import type { ComponentPayload, EntryComponentHistory } from '@boluo/api';
import { componentChangesFromHistory } from './component-history';

const row = (componentType = 'core/counter'): EntryComponentHistory => ({
  entryEffectId: 'effect',
  entryId: 'entry',
  scopeId: 'scope',
  operatorId: null,
  key: 'hp',
  componentType,
  created: '',
  action: 'SET',
  beforePayload: { payloadType: 'JSON', schemaVersion: 1, data: { value: 12.5, min: -5, max: 20 } },
  payload: { payloadType: 'JSON', schemaVersion: 1, data: { value: 9, min: -3, max: 20 } },
});

test('component history preserves references and actual before/after payloads', () => {
  const history = row();
  const [change] = componentChangesFromHistory([history]);
  assert.deepEqual(change, {
    component: { entryId: 'entry', scopeId: 'scope', key: 'hp', componentType: 'core/counter' },
    displayName: '',
    before: history.beforePayload,
    after: history.payload,
  });
});

test('null means absence, while text and asset payloads survive without counter parsing', () => {
  const text: EntryComponentHistory = {
    ...row('example/text'),
    beforePayload: null,
    payload: { payloadType: 'JSON', schemaVersion: 2, data: { text: 'Hello' } },
  };
  const asset: EntryComponentHistory = {
    ...row('core/portrait'),
    beforePayload: null,
    payload: { payloadType: 'ASSET', assetId: 'asset' },
  };
  const removed = { ...row(), action: 'REMOVE' as const, payload: null };
  const changes = componentChangesFromHistory([text, asset, removed]);
  assert.deepEqual(
    changes.map((change) => change.after),
    [text.payload, asset.payload, null],
  );
  assert.equal(changes[0]?.before, null);
});

test('JSON null remains a payload rather than component absence', () => {
  const payload: ComponentPayload = { payloadType: 'JSON', schemaVersion: 1, data: null };
  const [change] = componentChangesFromHistory([{ ...row('example/text'), payload }]);
  assert.deepEqual(change?.after, payload);
});
