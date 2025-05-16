import { type EventId } from '@boluo/api';
import * as L from 'list';

export function by(a: number, b: number): number {
  return b - a;
}

export function byReverse(a: number, b: number): number {
  return a - b;
}

export function byPos(a: { pos: number }, b: { pos: number }): number {
  return a.pos - b.pos;
}

export function binarySearchPosList<T extends { pos: number }>(
  arr: L.List<T>,
  targetPos: number,
): [number, T | null] {
  const head = L.head(arr);
  const last = L.last(arr);
  if (!head || !last || targetPos < head.pos) {
    return [0, null];
  } else if (targetPos === head.pos) {
    return [0, head];
  } else if (targetPos === last.pos) {
    return [arr.length - 1, last];
  } else if (targetPos > last.pos) {
    return [arr.length, null];
  }
  let left = 0;
  let right = arr.length - 1;

  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);
    const midItem = L.nth(mid, arr)!;
    const midPos = midItem.pos;
    if (midPos === targetPos) {
      return [mid, midItem];
    } else if (midPos < targetPos) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  return [left, null];
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

export const eventIdCompare = (a: EventId, b: EventId): number => {
  if (a.timestamp !== b.timestamp) {
    return a.timestamp - b.timestamp;
  } else if (a.node !== b.node) {
    console.warn('Compare eventId with different node');
    return a.node - b.node;
  } else {
    return a.seq - b.seq;
  }
};

export const eventIdMax = (a: EventId, b: EventId): EventId => {
  if (eventIdCompare(a, b) < 0) {
    return b;
  } else {
    return a;
  }
};

export const eventIdMin = (a: EventId, b: EventId): EventId => {
  if (eventIdCompare(a, b) < 0) {
    return a;
  } else {
    return b;
  }
};
