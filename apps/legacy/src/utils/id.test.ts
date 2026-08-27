import assert from 'node:assert/strict';
import test from 'node:test';
import { decodeUuid, encodeUuid } from './id';

test('legacy route UUID codec round trips UUIDs', () => {
  const uuid = '5ee4ad10-e6da-11f0-9f11-634c5024b6f4';
  const encoded = encodeUuid(uuid);

  assert.strictEqual(encoded.length, 22);
  assert.strictEqual(decodeUuid(encoded), uuid);
});

test('legacy route UUID decoder rejects malformed values', () => {
  const malformedValues = [
    '',
    'new',
    'AA',
    'AAAAAAAAAAAAAAAAAAAAA',
    'AAAAAAAAAAAAAAAAAAAAAAA',
    'AAAAAAAAAAAAAAAAAAAAA_',
    '5ee4ad10-e6da-11f0-9f11-634c5024b6f4',
  ];

  for (const value of malformedValues) {
    assert.strictEqual(decodeUuid(value), undefined, value);
  }
});
