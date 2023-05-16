export function by(a: number, b: number): number {
  return b - a;
}

export function byReverse(a: number, b: number): number {
  return a - b;
}

export function byPos(a: { pos: number }, b: { pos: number }): number {
  return a.pos - b.pos;
}

export function binarySearchPos(arr: Array<{ pos: number }>, targetPos: number): number {
  let left = 0;
  let right = arr.length - 1;

  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);
    if (arr[mid]!.pos === targetPos) {
      return mid;
    } else if (arr[mid]!.pos < targetPos) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return left;
}
