/*
Modified from https://github.com/vultix/ts-results
*/

export class UnwrapError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'UnwrapError';
    Object.setPrototypeOf(this, UnwrapError.prototype);
  }
}

export class Err<E> {
  readonly isOk = false;
  readonly isErr = true;

  constructor(public readonly value: E) {}

  ok(): null {
    return null;
  }

  err(): E {
    return this.value;
  }

  expect(msg: string): never {
    console.error(this.value);
    throw new UnwrapError(msg);
  }

  unwrap(): never {
    if (typeof this.value === 'string') {
      throw new UnwrapError(this.value);
    }
    this.expect('called `unwrap()` on a `Err` value.');
  }

  unwrapOr<T>(other: T): T {
    return other;
  }

  unwrapOrElse<T>(orElse: (err: E) => T): T {
    return orElse(this.value);
  }

  map(): Err<E> {
    return this;
  }

  mapErr<E2>(mapper: (err: E) => E2): Err<E2> {
    return new Err(mapper(this.value));
  }

  andThen(): Err<E> {
    return this;
  }
}

export class Ok<T> {
  readonly isOk = true;
  readonly isErr = false;

  constructor(public readonly value: T) {}

  ok(): T {
    return this.value;
  }

  err(): null {
    return null;
  }

  expect(): T {
    return this.value;
  }

  unwrap(): T {
    return this.value;
  }

  unwrapOr(other: T): T {
    return this.value;
  }

  unwrapOrElse(): T {
    return this.value;
  }

  map<U>(mapper: (value: T) => U): Ok<U> {
    return new Ok(mapper(this.value));
  }

  mapErr<E2>(): Ok<T> {
    return this;
  }

  andThen<U, E>(f: (a: T) => Result<U, E>) {
    return f(this.value);
  }
}

export type Result<T, E> = (Ok<T> | Err<E>) & {
  ok(): T | null;
  err(): E | null;
  map<U>(mapper: (value: T) => U): Result<U, E>;
  mapErr<E2>(mapper: (value: E) => E2): Result<T, E2>;
  andThen<U>(f: (a: T) => Result<U, E>): Result<U, E>;
};
