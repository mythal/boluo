/* eslint-disable @typescript-eslint/no-unused-vars,@typescript-eslint/no-use-before-define */
import { Binary, Emphasis, Entity, Expr, ExprNode, Link, Num, Operator, Roll, Strong, SubExpr, Text } from './entities';

interface State {
  text: string;
  rest: string;
}

// Infrastructure

export interface Env {
  defaultDiceFace: number;
  resolveUsername: (name: string) => string | null;
}

const emptyEnv: Env = {
  defaultDiceFace: 20,
  resolveUsername: () => null,
};

// Parser
class P<T> {
  constructor(public run: (state: State, env: Env) => [T, State] | null) {}

  map = <U>(mapper: (x: T) => U): P<U> =>
    new P((state, env) => {
      const result = this.run(state, env);
      if (!result) {
        return null;
      }
      const [r, s] = result;
      return [mapper(r), s];
    });

  then = <U>(mapper: (result: [T, State], env: Env) => [U, State] | null): P<U> =>
    new P<U>((state, env) => {
      const result = this.run(state, env);
      if (!result) {
        return null;
      }
      return mapper(result, env);
    });

  skip = <U>(p2: P<U>): P<T> =>
    new P((state, env) => {
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

  with = <U>(p2: P<U>): P<U> =>
    new P<U>((state, env) => {
      const result = this.run(state, env);
      if (!result) {
        return null;
      }
      return p2.run(result[1], env);
    });

  and = <U>(p2: P<U>): P<[T, U]> =>
    new P<[T, U]>((state, env) => {
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

const fail = <T>(): P<T> => new P<T>(() => null);

const and = <T>(parsers: Array<P<T>>): P<T[]> =>
  new P((state, env) => {
    const xs: T[] = [];
    for (const parser of parsers) {
      const result = parser.run(state, env);
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
  new P((state, env) => {
    for (const parser of parsers) {
      const result = parser.run(state, env);
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

const EM_REGEX = /^\*(.+?)\*/;

const emphasis = (): P<Entity> =>
  regex(EM_REGEX).then(([match, { text, rest }]) => {
    const [entire, content] = match;
    const entity: Emphasis = {
      type: 'Emphasis',
      start: text.length + entire.indexOf(content),
      offset: content.length,
    };
    text += entire;
    return [entity, { text, rest }];
  });

const STRONG_REGEX = /^\*\*(.+?)\*\*/;

const strong = (): P<Entity> =>
  regex(STRONG_REGEX).then(([match, { text, rest }]) => {
    const [entire, content] = match;
    const entity: Strong = {
      type: 'Strong',
      start: text.length + entire.indexOf(content),
      offset: content.length,
    };
    text += entire;
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

// \d+ match digits and stop.
// \s(?=\S) match single space and stop.
// [^...]: stop characters.
const TEXT_REGEX = /\d+|\s(?=\S)|[\s\S][^\d*@[(（#\s]*\s*/;

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
    const [entire, content, url] = match;
    const entity: Link = {
      type: 'Link',
      start: text.length + entire.indexOf(content),
      offset: content.length,
      href: url,
    };
    text += entire;
    return [entity, { text, rest }];
  });

const spaces = (): P<null> => regex(/^\s*/).map(() => null);

const roll = (): P<ExprNode> =>
  regex(/^(\d{0,3})[dD](?![a-zA-Z])(\d{0,4})/).then(([match, state], env) => {
    const [, before, after] = match;
    const node: Roll = {
      type: 'Roll',
      counter: before === '' ? 1 : Number(before),
      face: after === '' ? env.defaultDiceFace : Number(after),
    };
    return [node, state];
  });

const str = (s: string, appendText = false): P<string> =>
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

const chainl1 = <T, O>(op: P<O>, p: () => P<T>, cons: (op: O, l: T, r: T) => T): P<T> =>
  new P((state, env) => {
    const rest = (l: T): P<T> =>
      new P((state, env) => {
        const restExpr: P<T> = spaces()
          .with(op.skip(spaces()).and(p()))
          .then(([[op, r], state], env) => {
            return rest(cons(op, l, r)).run(state, env);
          });
        return maybe(restExpr)
          .map((node) => node ?? l)
          .run(state, env);
      });

    const result = p().run(state, env);
    if (result === null) {
      return null;
    }
    const [node, state2] = result;
    return rest(node).run(state2, env);
  });

const ExprMinMax = (node: ExprNode, type: 'Min' | 'Max'): ExprNode => {
  if (node.type === 'Roll') {
    return { type, node };
  } else if (node.type === 'Min') {
    return ExprMinMax(node.node, 'Min');
  } else if (node.type === 'Max') {
    return ExprMinMax(node.node, 'Max');
  } else if (node.type === 'Binary') {
    const l = ExprMinMax(node.l, type);
    const r = ExprMinMax(node.r, type);
    return { type: 'Binary', l, r, op: node.op };
  } else if (node.type === 'SubExpr') {
    if (node.node.type !== 'Binary') {
      return ExprMinMax(node.node, type);
    }
    const innerNode = ExprMinMax(node.node, type);
    return { type: 'SubExpr', node: innerNode };
  } else {
    return node;
  }
};

const min = (): P<ExprNode> => {
  return regex(/^[Mm][Ii][Nn]\s*/)
    .then(([_, state], env) => atom().run(state, env))
    .map((node) => ExprMinMax(node, 'Min'));
};

const max = (): P<ExprNode> => {
  return regex(/^[Mm][Aa][Xx]\s*/)
    .then(([_, state], env) => atom().run(state, env))
    .map((node) => ExprMinMax(node, 'Max'));
};

const subExprMapper = (node: ExprNode): SubExpr => (node.type === 'SubExpr' ? node : { type: 'SubExpr', node });

const atom = (): P<ExprNode> => {
  const subExpr = choice([
    regex(/^\(\s*/)
      .with(expr())
      .skip(regex(/^\s*\)/))
      .map(subExprMapper), // match (...)
    regex(/^（\s*/).with(expr()).skip(regex(/^\s*）/)).map(subExprMapper), // match （...）
    regex(/^\[\s*/)
      .with(expr())
      .skip(regex(/^\s*]/))
      .map(subExprMapper), // match [...]
  ]);
  return choice([roll(), num(), subExpr, max(), min()]);
};

const expr2 = (): P<ExprNode> =>
  chainl1<ExprNode, Operator>(operator2(), atom, (op, l, r) => ({ type: 'Binary', l, r, op }));
const expr = (): P<ExprNode> =>
  chainl1<ExprNode, Operator>(operator1(), expr2, (op, l, r) => ({ type: 'Binary', l, r, op }));

const expression = (): P<Entity> =>
  new P((state, env) => {
    const exprResult = expr().run(state, env);
    if (!exprResult) {
      return null;
    }
    const [node, { text, rest }] = exprResult;
    if (node.type === 'Num') {
      // A number isn't a expression.
      return null;
    }
    const consumed = state.rest.substr(0, state.rest.length - rest.length);
    const entity: Expr = {
      type: 'Expr',
      start: text.length,
      offset: consumed.length,
      node,
    };
    return [entity, { text: text + consumed, rest }];
  });

const mergeTextEntitiesReducer = (entities: Entity[], entity: Entity) => {
  if (entity.type !== 'Text') {
    entities.push(entity);
  } else if (entities.length === 0) {
    entities.push(entity);
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

export const parse = (source: string, parseExpr = true, env: Env = emptyEnv): ParseResult => {
  let state: State = { text: '', rest: source };
  const maybeParseExpr = parseExpr ? expression() : fail<Entity>();

  const entity = choice<Entity>([emphasis(), strong(), link(), autoUrl(), maybeParseExpr, span()]);

  const message: P<Entity[]> = many(entity).map((entityList) => entityList.reduce(mergeTextEntitiesReducer, []));
  const result = message.run(state, env);

  if (!result) {
    throw Error('Failed to parse the source: ' + source);
  }
  const [entities, nextState] = result;
  state = nextState;
  return { text: state.text, entities };
};
