export const shallowEqual = <T extends object>(left: T, right: T): boolean => {
  if (Object.is(left, right)) return true;
  const leftKeys = Object.keys(left) as Array<keyof T>;
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(right, key) && Object.is(left[key], right[key]),
  );
};
