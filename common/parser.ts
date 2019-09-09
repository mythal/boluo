import { Entity, Link, Strong, Text, ExprNode, Roll, Expr } from './entities';

interface State {
  text: string;
  rest: string;
}

// Infrastructure

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
}

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

const TEXT_REGEX = /^[\s\S][^*[@\s]*\s*/;
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

const roll = (): P<ExprNode> =>
  regex(/^(\d{0,2})d(\d{0,3})/).then(([match, state]) => {
    const [_, before, after] = match;
    const node: Roll = {
      type: 'Roll',
      counter: before === '' ? 1 : Number(before),
      face: after === '' ? undefined : Number(after),
    };
    return [node, state];
  });

const expr = (): P<Entity> => {
  return choice([roll()]).then<Entity>(([node, { text, rest }]) => {
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
};

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

export const parse = (source: string): ParseResult => {
  let state: State = { text: '', rest: source };

  const entity = choice<Entity>([strong(), link(), autoUrl(), expr(), span()]);

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
