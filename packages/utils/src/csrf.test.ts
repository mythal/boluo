import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import { readCookie } from './csrf.js';

describe('readCookie', () => {
  test('returns null for empty cookie source', () => {
    assert.strictEqual(readCookie('boluo-csrf-token', ''), null);
  });

  test('reads value from a single cookie entry', () => {
    assert.strictEqual(readCookie('boluo-csrf-token', 'boluo-csrf-token=abc123'), 'abc123');
  });

  test('reads target value from multiple cookie entries', () => {
    const source = 'theme=dark; boluo-csrf-token=signed-token; locale=en';
    assert.strictEqual(readCookie('boluo-csrf-token', source), 'signed-token');
  });

  test('keeps everything after first = in cookie value', () => {
    const source = 'boluo-csrf-token=a=b=c; locale=en';
    assert.strictEqual(readCookie('boluo-csrf-token', source), 'a=b=c');
  });

  test('returns null when target cookie is missing', () => {
    const source = 'theme=dark; locale=en';
    assert.strictEqual(readCookie('boluo-csrf-token', source), null);
  });

  test('returns null when target cookie value is empty', () => {
    const source = 'theme=dark; boluo-csrf-token=; locale=en';
    assert.strictEqual(readCookie('boluo-csrf-token', source), null);
  });

  test('does not match partial cookie names', () => {
    const source = 'x-boluo-csrf-token=bad; boluo-csrf-token=good';
    assert.strictEqual(readCookie('boluo-csrf-token', source), 'good');
  });
});
