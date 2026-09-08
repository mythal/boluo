export interface State {
  text: string;
  rest: string;
}

export class Parser<T, Env> {
  constructor(public run: (state: State, env: Env) => [T, State] | null) {}

  map = <U>(mapper: (x: T) => U): Parser<U, Env> =>
    new Parser<U, Env>((state, env) => {
      const result = this.run(state, env);
      if (!result) {
        return null;
      }
      const [r, s] = result;
      return [mapper(r), s];
    });

  then = <U>(mapper: (result: [T, State], env: Env) => [U, State] | null): Parser<U, Env> =>
    new Parser<U, Env>((state, env) => {
      const result = this.run(state, env);
      if (!result) {
        return null;
      }
      return mapper(result, env);
    });

  skip = <U>(p2: Parser<U, Env>): Parser<T, Env> =>
    new Parser<T, Env>((state, env) => {
      const result = this.run(state, env);
      if (!result) {
        return null;
      }
      const [r, s1] = result;
      const skipResult = p2.run(s1, env);
      if (!skipResult) {
        return null;
      }
      const s = skipResult[1];
      return [r, s];
    });

  with = <U>(p2: Parser<U, Env>): Parser<U, Env> =>
    new Parser<U, Env>((state, env) => {
      const result = this.run(state, env);
      if (!result) {
        return null;
      }
      return p2.run(result[1], env);
    });

  and = <U>(p2: Parser<U, Env>): Parser<[T, U], Env> =>
    new Parser<[T, U], Env>((state, env) => {
      const r1 = this.run(state, env);
      if (!r1) {
        return null;
      }
      const [x1, s1] = r1;
      const r2 = p2.run(s1, env);
      if (!r2) {
        return null;
      }
      const [x2, s2] = r2;
      return [[x1, x2], s2];
    });
}

// Bind the grammar environment once so individual parsers only need a result type.
export const createParserCombinators = <Env = unknown>() => {
  class P<T> extends Parser<T, Env> {}

  // Build recursive grammar once, when first used rather than during module initialization.
  const lazy = <T>(build: () => P<T>): P<T> => {
    let parser: P<T> | undefined;
    return new P((state, env) => (parser ??= build()).run(state, env));
  };

  const maybe = <T>(p: P<T | null>) =>
    new P<T | null>((state, env) => {
      const result = p.run(state, env);
      return result ? result : [null, state];
    });

  const many = <T>(p: P<T>) =>
    new P((state, env) => {
      const xs: T[] = [];
      for (;;) {
        const result = p.run(state, env);
        if (!result) {
          break;
        }
        const [v, s] = result;
        xs.push(v);
        state = s;
      }
      return [xs, state];
    });

  const many1 = <T>(p: P<T>): P<[T, ...T[]]> =>
    p.and(many(p)).map(([first, rest]) => [first, ...rest]);

  const choice = <T>(parsers: Array<P<T>>): P<T> =>
    new P((state, env) => {
      for (const parser of parsers) {
        const result = parser.run(state, env);
        if (result) {
          return result;
        }
      }
      return null;
    });

  const regex = (pattern: RegExp, appendText = false): P<RegExpMatchArray> =>
    new P(({ text, rest }) => {
      const match = rest.match(pattern);
      if (!match) {
        return null;
      }
      const matched = match[0];
      rest = rest.substring(matched.length);
      return [match, { text: appendText ? text + matched : text, rest }];
    });

  const end = regex(/^$/).map(() => null);
  const spaces = regex(/^\s*/, true).map(() => null);
  const smallSpaces = regex(/^ {0,2}/, true).map(() => null);

  return { P, lazy, maybe, many, many1, choice, regex, end, spaces, smallSpaces };
};
