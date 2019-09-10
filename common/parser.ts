import { Entity, Link, Strong, Text, ExprNode, Roll, Expr, Binary, Num, Operator } from './entities';

interface State {
  text: string;
  rest: string;
}

// Infrastructure

// Parser
class P<T> {
  constructor(public run: (state: State) => [T, State] | null) {}

  map = <U>(mapper: (x: T) => U): P<U> =>
    new P(state => {
      const result = this.run(state);
      if (!result) {
        return null;
      }
      const [r, s] = result;
      return [mapper(r), s];
    });

  then = <U>(mapper: (result: [T, State]) => [U, State] | null): P<U> =>
    new P<U>(state => {
      const result = this.run(state);
      if (!result) {
        return null;
      }
      return mapper(result);
    });

  skip = <U>(p2: P<U>): P<T> =>
    new P(state => {
      const result = this.run(state);
      if (!result) {
        return null;
      }
      const [r, s1] = result;
      const skipResult = p2.run(s1);
      if (!skipResult) {
        return null;
      }
      const [_, s] = skipResult;
      return [r, s];
    });

  with = <U>(p2: P<U>): P<U> =>
    new P<U>(state => {
      const result = this.run(state);
      if (!result) {
        return null;
      }
      return p2.run(result[1]);
    });

  many = (): P<T[]> =>
    new P(state => {
      const xs: T[] = [];
      for (;;) {
        const result = this.run(state);
        if (!result) {
          break;
        }
        const [v, s] = result;
        xs.push(v);
        state = s;
      }
      return [xs, state];
    });

  many1 = (): P<T[]> => {
    const parser = this.many();
    return new P(state => {
      const result = parser.run(state);
      return result && result[0].length > 0 ? result : null;
    });
  };

  maybe = (): P<T | null> =>
    new P<T | null>(state => {
      const result = this.run(state);
      return result ? result : [null, state];
    });

  and = <U>(p2: P<U>): P<[T, U]> =>
    new P<[T, U]>(state => {
      const r1 = this.run(state);
      if (!r1) {
        return null;
      }
      const [x1, s1] = r1;
      const r2 = p2.run(s1);
      if (!r2) {
        return null;
      }
      const [x2, s2] = r2;
      return [[x1, x2], s2];
    });

  or = (p2: P<T>): P<T> =>
    new P<T>(state => {
      const r1 = this.run(state);
      return r1 ? r1 : p2.run(state);
    });
}

const fail = <T>(): P<T> => new P<T>(state => null);

const and = <T>(parsers: Array<P<T>>): P<T[]> =>
  new P(state => {
    const xs: T[] = [];
    for (const parser of parsers) {
      const result = parser.run(state);
      if (!result) {
        return null;
      }
      const [v, s] = result;
      state = s;
      xs.push(v);
    }
    return [xs, state];
  });

const choice = <T>(parsers: Array<P<T>>): P<T> =>
  new P(state => {
    for (const parser of parsers) {
      const result = parser.run(state);
      if (result) {
        return result;
      }
    }
    return null;
  });

const regex = (pattern: RegExp): P<RegExpMatchArray> =>
  new P(({ text, rest }) => {
    const match = rest.match(pattern);
    if (!match) {
      return null;
    }
    const matched = match[0];
    rest = rest.substr(matched.length);
    return [match, { text, rest }];
  });

// Parsers

const STRONG_REGEX = /^\*\*(.+?)\*\*/;
const strong = (): P<Entity> =>
  regex(STRONG_REGEX).then(([match, { text, rest }]) => {
    const [_, content] = match;
    const entity: Strong = {
      type: 'Strong',
      start: text.length,
      offset: content.length,
    };
    text += content;
    return [entity, { text, rest }];
  });

const URL_REGEX = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/;

const autoUrl = (): P<Entity> =>
  regex(URL_REGEX).then(([match, { text, rest }]) => {
    const [content] = match;
    const entity: Link = {
      type: 'Link',
      href: content,
      start: text.length,
      offset: content.length,
    };
    text += content;
    return [entity, { text, rest }];
  });

const TEXT_REGEX = /\d+|.[^\d*@[(（#\s]*\s*/s;

const span = (): P<Text> =>
  regex(TEXT_REGEX).then(([match, { text, rest }]) => {
    const [content] = match;
    const offset = content.length;
    const entity: Text = {
      type: 'Text',
      start: text.length,
      offset,
    };
    text += content;
    return [entity, { text, rest }];
  });

const LINK_REGEX = /^\[(.+)]\((.+)\)/;
const link = (): P<Entity> =>
  regex(LINK_REGEX).then(([match, { text, rest }]) => {
    const [_, content, url] = match;
    const entity: Link = {
      type: 'Link',
      start: text.length,
      offset: content.length,
      href: url,
    };
    text += content;
    return [entity, { text, rest }];
  });

const spaces = (): P<null> => regex(/^\s*/).map(() => null);

const roll = (): P<ExprNode> =>
  regex(/^(\d{0,3})d(?![a-zA-Z])(\d{0,4})/).then(([match, state]) => {
    const [_, before, after] = match;
    const node: Roll = {
      type: 'Roll',
      counter: before === '' ? 1 : Number(before),
      face: after === '' ? undefined : Number(after),
    };
    return [node, state];
  });

const str = (s: string, appendText: boolean = false): P<string> =>
  new P(({ text, rest }) => {
    if (!rest.startsWith(s)) {
      return null;
    }
    rest = rest.substr(s.length);
    if (appendText) {
      text += s;
    }
    return [s, { text, rest }];
  });

const atom = (): P<ExprNode> => {
  const subExpr = choice([
    regex(/^\(\s*/)
      .with(expr())
      .skip(regex(/^\s*\)/)), // match (...)
    regex(/^（\s*/)
      .with(expr())
      .skip(regex(/^\s*）/)), // match （...）
    regex(/^\[\s*/)
      .with(expr())
      .skip(regex(/^\s*]/)), // match [...]
  ]);
  return choice([roll(), num(), subExpr]);
};

const operator1 = (): P<Operator> =>
  regex(/^[-+]/).map(
    ([op]): Operator => {
      if (op === '+') {
        return '+';
      } else if (op === '-') {
        return '-';
      }
      throw Error('unreachable');
    }
  );

const operator2 = (): P<Operator> =>
  regex(/^[*/×÷]/).map(
    ([op]): Operator => {
      if (op === '×' || op === '*') {
        return '×';
      } else if (op === '÷' || op === '/') {
        return '÷';
      }
      throw Error('unreachable');
    }
  );

const num = (): P<ExprNode> => regex(/^\d{1,5}/).map(([n]): Num => ({ type: 'Num', value: Number(n) }));

const expr2 = (): P<ExprNode> =>
  new P(state => {
    const left = atom();
    const restExpr: P<[Operator, ExprNode]> = spaces().with(
      operator2()
        .skip(spaces())
        .and(expr2())
    );
    const maybeExpr: P<[ExprNode, [Operator, ExprNode] | null]> = left.and(restExpr.maybe());
    return maybeExpr
      .map<ExprNode>(([l, maybeRest]) => {
        if (!maybeRest) {
          return l;
        }
        const [op, r] = maybeRest;
        const node: Binary = { type: 'Binary', l, r, op };
        return node;
      })
      .run(state);
  });

const expr = (): P<ExprNode> =>
  new P(state => {
    const left = expr2();
    const restExpr: P<[Operator, ExprNode]> = spaces().with(
      operator1()
        .skip(spaces())
        .and(expr())
    );
    const maybeExpr: P<[ExprNode, [Operator, ExprNode] | null]> = left.and(restExpr.maybe());
    return maybeExpr
      .map<ExprNode>(([l, maybeRest]) => {
        if (!maybeRest) {
          return l;
        }
        const [op, r] = maybeRest;
        const node: Binary = { type: 'Binary', l, r, op };
        return node;
      })
      .run(state);
  });

const expression = (): P<Entity> =>
  expr().then<Entity>(([node, { text, rest }]) => {
    if (node.type === 'Num') {
      return null;
    }
    const content = '[expression]';
    const entity: Expr = {
      type: 'Expr',
      start: text.length,
      offset: content.length,
      node,
    };
    text += content;
    return [entity, { text, rest }];
  });

const mergeTextEntitiesReducer = (entities: Entity[], entity: Entity) => {
  if (entity.type !== 'Text') {
    entities.push(entity);
  } else if (entities.length === 0) {
    return entities;
  } else {
    const last = entities[entities.length - 1];
    if (last.type === 'Text') {
      last.offset += entity.offset;
    } else {
      entities.push(entity);
    }
  }
  return entities;
};

export interface ParseResult {
  text: string;
  entities: Entity[];
}

export const parse = (source: string, parseExpr: boolean = true): ParseResult => {
  let state: State = { text: '', rest: source };
  const maybeParseExpr = parseExpr ? expression() : fail<Entity>();

  const entity = choice<Entity>([strong(), link(), autoUrl(), maybeParseExpr, span()]);

  const message: P<Entity[]> = entity
    .many()
    .map(entityList => entityList.reduce<Entity[]>(mergeTextEntitiesReducer, []));
  const result = message.run(state);

  if (!result) {
    throw Error('Parse error.');
  }
  const [entities, nextState] = result;
  state = nextState;
  return { text: state.text, entities };
};
