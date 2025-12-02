import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import * as L from 'list';
import { binarySearchPos, binarySearchPosList } from './index';

const arr = [{ pos: 1 }, { pos: 3 }, { pos: 5 }, { pos: 7 }, { pos: 9 }];

describe('binarySearchPos', () => {
  test('pos exists in array', () => {
    assert.strictEqual(binarySearchPos(arr, 5), 2);
  });

  test('pos exists in array at tail', () => {
    assert.strictEqual(binarySearchPos(arr, 9), 4);
  });

  test('pos less than smallest in array', () => {
    assert.strictEqual(binarySearchPos(arr, 0), 0);
  });

  test('pos does not exist but falls within array', () => {
    assert.strictEqual(binarySearchPos(arr, 4), 2);
  });

  test('pos greater than largest in array', () => {
    assert.strictEqual(binarySearchPos(arr, 10), 5);
  });

  test('empty array', () => {
    assert.strictEqual(binarySearchPos([], 5), 0);
  });
});

describe('binarySearchPosList', () => {
  const lst = L.from(arr);

  test('pos exists in array', () => {
    assert.deepStrictEqual(binarySearchPosList(lst, 5), [2, { pos: 5 }]);
  });

  test('pos exists in array at tail', () => {
    assert.deepStrictEqual(binarySearchPosList(lst, 9), [4, { pos: 9 }]);
  });

  test('pos less than smallest in array', () => {
    assert.deepStrictEqual(binarySearchPosList(lst, 0), [0, null]);
  });

  test('pos does not exist but falls within array', () => {
    assert.deepStrictEqual(binarySearchPosList(lst, 4), [2, null]);
  });

  test('pos greater than largest in array', () => {
    assert.deepStrictEqual(binarySearchPosList(lst, 10), [5, null]);
  });

  test('empty array', () => {
    assert.deepStrictEqual(binarySearchPosList(L.empty(), 5), [0, null]);
  });
});
