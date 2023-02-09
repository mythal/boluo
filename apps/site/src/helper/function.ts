export const not = (x: unknown): boolean => !x;
export const toggle = not;

// identity
export type SelfMapper<T> = (x: T) => T;
export const identity = <T>(x: T): T => x;

export type EmptyFunction = () => void;
export const empty = () => {
  // empty function
};
