import { binarySearchPos } from './sort';

describe('binarySearchPos', () => {
  const arr = [{ pos: 1 }, { pos: 3 }, { pos: 5 }, { pos: 7 }, { pos: 9 }];

  // Testing for a pos that already exists in the array
  test('pos exists in array', () => {
    expect(binarySearchPos(arr, 5)).toEqual(2);
  });

  // Testing for a pos that is less than the smallest pos in the array
  test('pos less than smallest in array', () => {
    expect(binarySearchPos(arr, 0)).toEqual(0);
  });

  // Testing for a pos that doesn't exist but falls within the pos in the array
  test('pos does not exist but falls within array', () => {
    expect(binarySearchPos(arr, 4)).toEqual(2);
  });

  // Testing for a pos that is greater than the largest pos in the array
  test('pos greater than largest in array', () => {
    expect(binarySearchPos(arr, 10)).toEqual(5);
  });

  test('empty array', () => {
    expect(binarySearchPos([], 5)).toEqual(0);
  });
});
