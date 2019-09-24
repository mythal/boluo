// tslint:disable-next-line:no-namespace
export namespace Result {
  export interface Ok<T> {
    ok: true;
    some: T;
  }

  export interface Err<E> {
    ok: false;
    err: E;
  }

  export type Result<T, E> = Ok<T> | Err<E>;

  export const Ok = <T>(some: T): Ok<T> => ({ ok: true, some });

  export const Err = <E>(err: E): Err<E> => ({ ok: false, err });

  export const map = <T, U, E>(result: Result<T, E>, mapper: (t: T) => U): Result<U, E> => {
    if (result.ok) {
      return { ok: true, some: mapper(result.some) };
    } else {
      return result;
    }
  };

  export const andThen = <T, U, E>(result: Result<T, E>, mapper: (t: T) => Result<U, E>): Result<U, E> => {
    if (result.ok) {
      return mapper(result.some);
    } else {
      return result;
    }
  };

  export const isOk = <T, E>(result: Result<T, E>): result is Ok<T> => {
    return result.ok;
  };

  export const isErr = <T, E>(result: Result<T, E>): result is Err<E> => {
    return !result.ok;
  };

  export const throwErr = <T, E, Ex extends Error>(constructor: new (e: E) => Ex, result: Result<T, E>): T => {
    if (!result.ok) {
      throw new constructor(result.err);
    }
    return result.some;
  };

  export const mapErr = <T, E1, E2>(result: Result<T, E1>, mapper: (e: E1) => E2): Result<T, E2> => {
    if (result.ok) {
      return result;
    } else {
      return { ok: false, err: mapper(result.err) };
    }
  };

  export const unwrap = <T, E>(result: Result<T, E>): T => {
    if (!result.ok) {
      throw new Error(String(result.err));
    } else {
      return result.some;
    }
  };
}
