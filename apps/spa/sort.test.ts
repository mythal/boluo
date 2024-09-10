import { binarySearchPos, binarySearchPosList } from './sort';
import * as L from 'list';

const arr = [{ pos: 1 }, { pos: 3 }, { pos: 5 }, { pos: 7 }, { pos: 9 }];
describe('binarySearchPos', () => {
  test('pos exists in array', () => {
    expect(binarySearchPos(arr, 5)).toEqual(2);
  });

  test('pos exists in array', () => {
    expect(binarySearchPos(arr, 9)).toEqual(4);
  });

  test('pos less than smallest in array', () => {
    expect(binarySearchPos(arr, 0)).toEqual(0);
  });

  test('pos does not exist but falls within array', () => {
    expect(binarySearchPos(arr, 4)).toEqual(2);
  });

  test('pos greater than largest in array', () => {
    expect(binarySearchPos(arr, 10)).toEqual(5);
  });

  test('empty array', () => {
    expect(binarySearchPos([], 5)).toEqual(0);
  });
});

describe('binarySearchPosList', () => {
  const lst = L.from(arr);

  test('pos exists in array', () => {
    expect(binarySearchPosList(lst, 5)).toEqual([2, { pos: 5 }]);
  });

  test('pos exists in array', () => {
    expect(binarySearchPosList(lst, 9)).toEqual([4, { pos: 9 }]);
  });

  test('pos less than smallest in array', () => {
    expect(binarySearchPosList(lst, 0)).toEqual([0, null]);
  });

  test('pos does not exist but falls within array', () => {
    expect(binarySearchPosList(lst, 4)).toEqual([2, null]);
  });

  test('pos greater than largest in array', () => {
    expect(binarySearchPosList(lst, 10)).toEqual([5, null]);
  });

  test('empty array', () => {
    expect(binarySearchPosList(L.empty(), 5)).toEqual([0, null]);
  });
});
