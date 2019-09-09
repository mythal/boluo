import { Entity, Link, Strong, Text } from './entities';

interface State {
  text: string;
  rest: string;
}

type Parser<T> = (state: State) => [T, State] | null;

const map = <T, U>(parser: Parser<T>, mapper: (x: T) => U): Parser<U> => state => {
  const parseResult = parser(state);
  if (parseResult) {
    const [r, s] = parseResult;
    return [mapper(r), s];
  } else {
    return null;
  }
};

const many = <T>(parser: Parser<T>): Parser<T[]> => state => {
  const values: T[] = [];
  for (;;) {
    const result = parser(state);
    if (!result) {
      break;
    }
    const [v, s] = result;
    values.push(v);
    state = s;
  }
  return [values, state];
};

const many1 = <T>(parser: Parser<T>): Parser<T[]> => {
  const manyParser = many(parser);
  return state => {
    const result = manyParser(state);
    if (!result || result[0].length === 0) {
      return null;
    } else {
      return result;
    }
  };
};

const and = <T>(parsers: Array<Parser<T>>): Parser<T[]> => state => {
  const xs: T[] = [];
  for (const parser of parsers) {
    const result = parser(state);
    if (!result) {
      return null;
    }
    const [v, s] = result;
    state = s;
    xs.push(v);
  }
  return [xs, state];
};

const choice = <T>(parsers: Array<Parser<T>>): Parser<T> => state => {
  for (const parser of parsers) {
    const result = parser(state);
    if (result) {
      return result;
    }
  }
  return null;
};

const skipBefore = <T, U>(parser: Parser<T>, skipParser: Parser<U>): Parser<T> => state => {
  const result = parser(state);
  if (!result) {
    return null;
  }
  const [r, sSkip] = result;
  const skipResult = skipParser(sSkip);
  if (!skipResult) {
    return null;
  }
  const [_, s] = skipResult;
  return [r, s];
};

const skipAfter = <T, U>(skipParser: Parser<T>, parser: Parser<U>): Parser<U> => state => {
  const skipResult = skipParser(state);
  if (!skipResult) {
    return null;
  }
  return parser(skipResult[1]);
};

const strong = (): Parser<Entity> => ({ text, rest }) => {
  const STRONG_REGEX = /^\*\*(.+?)\*\*/;
  const match = rest.match(STRONG_REGEX);
  if (!match) {
    return null;
  }
  const matched = match[0];
  const content = match[1];
  const entity: Strong = {
    type: 'Strong',
    start: text.length,
    offset: matched.length,
  };
  text += content;
  rest = rest.substr(matched.length);
  return [entity, { text, rest }];
};

const autoUrl = (): Parser<Entity> => ({ text, rest }) => {
  const URL_REGEX = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/;
  const match = rest.match(URL_REGEX);
  if (!match) {
    return null;
  }
  const content = match[0];
  const entity: Link = {
    type: 'Link',
    href: content,
    start: text.length,
    offset: content.length,
  };
  text += content;
  rest = rest.substr(content.length);
  return [entity, { text, rest }];
};

const span = (): Parser<Text> => ({ text, rest }) => {
  const TEXT_REGEX = /^[\s\S][^*[@\s]*\s*/;
  const match = rest.match(TEXT_REGEX);
  if (!match) {
    return null;
  }
  const matched = match[0];
  const entity: Text = {
    type: 'Text',
    start: text.length,
    offset: matched.length,
  };
  text += matched;
  rest = rest.substr(matched.length);
  return [entity, { text, rest }];
};

const link = (): Parser<Entity> => ({ text, rest }) => {
  const LINK_REGEX = /^\[(.+)]\((.+)\)/;
  const match = rest.match(LINK_REGEX);
  if (!match) {
    return null;
  }
  const matched = match[0];
  const content = match[1];
  const url = match[2];
  const entity: Link = {
    type: 'Link',
    start: text.length,
    offset: content.length,
    href: url,
  };
  text += content;
  rest = rest.substr(matched.length);
  return [entity, { text, rest }];
};

interface ParseResult {
  text: string;
  entities: Entity[];
}

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

export const parse = (source: string): ParseResult => {
  let state: State = { text: '', rest: source };

  const entity = choice<Entity>([strong(), link(), autoUrl(), span()]);

  const message: Parser<Entity[]> = map(many(entity), entityList =>
    entityList.reduce<Entity[]>(mergeTextEntitiesReducer, [])
  );
  const result = message(state);

  if (!result) {
    throw Error('Parse error.');
  }
  const [entities, nextState] = result;
  state = nextState;
  return { text: state.text, entities };
};
