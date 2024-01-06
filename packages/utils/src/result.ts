/*
Modified from https://github.com/vultix/ts-results
*/

export class Err<E> {
  readonly isOk = false;
  readonly isErr = true;

  constructor(public readonly err: E) {}

  ok(): null {
    return null;
  }

  expect(msg: string): never {
    console.error(msg);
    throw this.err;
  }

  unwrap(): never {
    console.error('Unhandled error', this.err);
    throw this.err;
  }

  unwrapOr<T>(other: T): T {
    return other;
  }

  unwrapOrElse<T>(orElse: (err: E) => T): T {
    return orElse(this.err);
  }

  map(): Err<E> {
    return this;
  }

  mapErr<E2>(mapper: (err: E) => E2): Err<E2> {
    return new Err(mapper(this.err));
  }

  andThen(): Err<E> {
    return this;
  }
}

export class Ok<T> {
  readonly isOk = true;
  readonly isErr = false;

  constructor(public readonly some: T) {}

  expect(): T {
    return this.some;
  }

  unwrap(): T {
    return this.some;
  }

  unwrapOr(other: T): T {
    return this.some;
  }

  unwrapOrElse(): T {
    return this.some;
  }

  map<U>(mapper: (value: T) => U): Ok<U> {
    return new Ok(mapper(this.some));
  }

  mapErr<E2>(): Ok<T> {
    return this;
  }

  andThen<U, E>(f: (a: T) => Result<U, E>) {
    return f(this.some);
  }
}

export type Result<T, E> = (Ok<T> | Err<E>) & {
  map<U>(mapper: (value: T) => U): Result<U, E>;
  mapErr<E2>(mapper: (value: E) => E2): Result<T, E2>;
  andThen<U>(f: (a: T) => Result<U, E>): Result<U, E>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const unwrap = <T>(result: Result<T, any>): T => {
  if (result.isOk) {
    return result.some;
  } else {
    return result.unwrap();
  }
};

export const expect =
  (msg: string) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  <T>(result: Result<T, any>): T => {
    if (result.isOk) {
      return result.some;
    } else {
      return result.expect(msg);
    }
  };
