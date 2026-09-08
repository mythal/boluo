import { createParserCombinators, type Parser, type State } from './parser-combinator';
/* eslint-disable @typescript-eslint/no-unused-vars */
import type {
  ExprOf,
  EntityOf,
  Entity,
  Operator,
  ExprNode,
  PureExprNode,
  PureExprOf,
} from '@boluo/api';
import type { AsTarget } from './parse-result';
import { normalizeVariableLookupKey, type Variables } from './variables';

// Infrastructure

export interface MessageParseEnv {
  defaultDiceFace: number;
  variables?: Variables;
}

interface ParseEnv extends MessageParseEnv {
  variableMode?: 'resolve' | 'probe';
}

export const defaultMessageParseEnv: MessageParseEnv = {
  defaultDiceFace: 20,
};

// Parser
const { P, maybe, many, choice, regex, spaces, smallSpaces } = createParserCombinators<ParseEnv>();
type P<T> = Parser<T, ParseEnv>;

// Parsers

const EM_REGEX = /^\*(.+?)\*/;

const emphasis: P<Entity> = regex(EM_REGEX).then(([match, { text, rest }]) => {
  const [entire, content = ''] = match;
  const entity: EntityOf<'Emphasis'> = {
    type: 'Emphasis',
    start: text.length,
    len: entire.length,
    child: {
      type: 'Text',
      start: text.length + entire.indexOf(content),
      len: content.length,
    },
  };
  text += entire;
  return [entity, { text, rest }];
});

const CODE_REGEX = /^`(.+?)`/;
const code: P<Entity> = regex(CODE_REGEX).then(([match, { text, rest }]) => {
  const [entire, content = ''] = match;
  const entity: EntityOf<'Code'> = {
    type: 'Code',
    start: text.length,
    child: {
      type: 'Text',
      start: text.length + entire.indexOf(content),
      len: content.length,
    },
    len: entire.length,
  };
  text += entire;
  return [entity, { text, rest }];
});

const CODE_BLOCK_REGEX = /^```\n?([\s\S]*?)\n?```\s*/;
const codeBlock: P<Entity> = regex(CODE_BLOCK_REGEX).then(([match, { text, rest }]) => {
  const [entire, content = ''] = match;
  const entity: EntityOf<'CodeBlock'> = {
    type: 'CodeBlock',
    start: text.length,
    len: entire.length,
    child: {
      type: 'Text',
      start: text.length + entire.indexOf(content),
      len: content.length,
    },
  };
  text += entire;
  return [entity, { text, rest }];
});

const STRONG_REGEX = /^\*\*(.+?)\*\*/;

const strong: P<Entity> = regex(STRONG_REGEX).then(([match, { text, rest }]) => {
  const [entire, content = ''] = match;
  const entity: EntityOf<'Strong'> = {
    type: 'Strong',
    start: text.length,
    len: entire.length,
    child: {
      type: 'Text',
      start: text.length + entire.indexOf(content),
      len: content.length,
    },
  };
  text += entire;
  return [entity, { text, rest }];
});

const STRONG_EM_REGEX = /^\*\*\*(.+?)\*\*\*/;

const strongEmphasis: P<Entity> = regex(STRONG_EM_REGEX).then(([match, { text, rest }]) => {
  const [entire, content = ''] = match;

  const entity: EntityOf<'StrongEmphasis'> = {
    type: 'StrongEmphasis',
    start: text.length,
    len: entire.length,

    child: {
      type: 'Text',
      start: text.length + entire.indexOf(content),
      len: content.length,
    },
  };

  text += entire;
  return [entity, { text, rest }];
});

const URL_REGEX =
  /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/;

const autoUrl: P<Entity> = regex(URL_REGEX).then(([match, { text, rest }]) => {
  const [content] = match;
  const entity: EntityOf<'Link'> = {
    type: 'Link',
    child: {
      type: 'Text',
      start: text.length,
      len: content.length,
    },
    href: {
      start: text.length,
      len: content.length,
    },
    start: text.length,
    len: content.length,
  };
  text += content;
  return [entity, { text, rest }];
});

// \d+ match digits and stop.
// \s(?=\S) match single space and stop.
// [^...]: stop characters.
const TEXT_REGEX =
  /\d+|\s(?=\S)|[，。、)）」】\]：！？]+\s*|[\s\S][^\d*{【@[(/（#\s，。、）)」】\]：！？]*\s*/;

const span: P<EntityOf<'Text'>> = regex(TEXT_REGEX).then(([match, { text, rest }]) => {
  const [content] = match;
  const offset = content.length;
  const entity: EntityOf<'Text'> = {
    type: 'Text',
    start: text.length,
    len: offset,
  };
  text += content;
  return [entity, { text, rest }];
});

const mention: P<string> = regex(/^@([\w_\d]{3,32})\s*/).then(([match, { text, rest }]) => {
  const [entire, username] = match;
  if (!username) {
    return null;
  }
  return [username, { text: text + entire, rest }];
});

const LINK_REGEX = /^\[(.+?)]\(([^)]+?)\)/;
const link: P<Entity> = regex(LINK_REGEX).then(([match, { text, rest }]) => {
  const [entire, content = '', link = ''] = match;
  let href: EntityOf<'Link'>['href'];
  if (link.length === 0) {
    href = link;
  } else {
    try {
      new URL(link);
      href = {
        start: text.length + entire.lastIndexOf(link),
        len: link.length,
      };
    } catch {
      href = `http://${link}`;
    }
  }

  const entity: EntityOf<'Link'> = {
    type: 'Link',
    start: text.length,
    len: entire.length,
    child: {
      type: 'Text',
      start: text.length + entire.indexOf(content),
      len: content.length,
    },
    href,
  };
  text += entire;
  return [entity, { text, rest }];
});

const fateRoll: P<ExprOf<'FateRoll'>> = regex(/^([Ff][Aa][Tt][Ee]|dF)\b/).map(() => {
  return { type: 'FateRoll' };
});

const srRoll: P<ExprOf<'DicePool'>> = regex(/^sr(p?) {0,2}(\d+)\b/).then(([match, state]) => {
  const push = Boolean(match[1]);
  const counterStr = match[2];
  if (!counterStr) {
    return null;
  }
  const counter = parseInt(counterStr);
  if (counter < 1) {
    return null;
  }
  const node: ExprOf<'DicePool'> = {
    type: 'DicePool',
    counter,
    face: 6,
    min: 5,
    addition: push ? 6 : 0,
    fumble: 1,
    critical: 6,
  };
  return [node, state];
});

const wodRoll: P<ExprOf<'DicePool'>> = regex(/^[wW](?:_(\d))? {0,2}(\d{1,3})\b/).then(
  ([match, state], env) => {
    const addStr = match[1] || '10';
    const counterStr = match[2];
    if (!counterStr) {
      return null;
    }
    const counter = parseInt(counterStr);
    const addition = parseInt(addStr);
    if (counter < 1 || addition < 4) {
      return null;
    }
    const node: ExprOf<'DicePool'> = {
      type: 'DicePool',
      counter,
      face: 10,
      min: 8,
      addition,
      fumble: 1,
      critical: 10,
    };
    return [node, state];
  },
);

const cocRoll: P<ExprOf<'CocRoll'>> = regex(/^[Cc][Oo][Cc]([Bb][Bb]?|[Pp][Pp]?)?\b/).then(
  ([[entire, modifier], state], env) => {
    modifier = (modifier || '').toLowerCase();
    let subType: ExprOf<'CocRoll'>['subType'] = 'NORMAL';
    switch (modifier) {
      case 'p':
        subType = 'PENALTY';
        break;
      case 'pp':
        subType = 'PENALTY_2';
        break;
      case 'b':
        subType = 'BONUS';
        break;
      case 'bb':
        subType = 'BONUS_2';
        break;
    }
    const node: ExprOf<'CocRoll'> = {
      type: 'CocRoll',
      subType,
    };
    const right = smallSpaces.with(atomPure()).run(state, env);
    if (right) {
      const [target, state] = right;
      node.target = target;
      return [node, state];
    }
    return [node, state];
  },
);

const roll: P<ExprNode> = regex(/^(\d{0,3})[dD](\d{0,4})(?:([kKLlHh])(\d{1,3}))?(?![a-zA-Z])/).then(
  ([match, state], env) => {
    const [, before, after, filter, filterCounter] = match;
    let counter = before === '' ? 1 : Number(before);
    if (counter < 1) {
      counter = 1;
    }
    let face = after === '' ? env.defaultDiceFace : Number(after);
    if (face < 1) {
      face = env.defaultDiceFace;
    }
    const node: ExprOf<'Roll'> = {
      type: 'Roll',
      counter,
      face,
    };
    if (filter && filterCounter) {
      let type: 'LOW' | 'HIGH' = 'HIGH';
      if (filter === 'l' || filter === 'L') {
        type = 'LOW';
      }
      const counter = parseInt(filterCounter);
      node.filter = [type, counter];
    }
    return [node, state];
  },
);

const str = (s: string, appendText = false): P<string> =>
  new P(({ text, rest }) => {
    if (!rest.startsWith(s)) {
      return null;
    }
    rest = rest.substring(s.length);
    if (appendText) {
      text += s;
    }
    return [s, { text, rest }];
  });

const operator1: P<Operator> = regex(/^[-+]/).map(([op]): Operator => {
  if (op === '+') {
    return '+';
  } else if (op === '-') {
    return '-';
  }
  throw Error('unreachable');
});

const operator2: P<Operator> = regex(/^[*/×÷]/).map(([op]): Operator => {
  if (op === '×' || op === '*') {
    return '×';
  } else if (op === '÷' || op === '/') {
    return '÷';
  }
  throw Error('unreachable');
});

const num: P<ExprOf<'Num'>> = regex(/^\d{1,5}/).map(([n]): ExprOf<'Num'> => ({
  type: 'Num',
  value: Number(n),
}));

const variable: P<ExprOf<'Variable'>> = new P((state, env) => {
  const explicit = state.rest.match(/^\$\[([^\]\r\n]+)\]/u);
  const bare = state.rest.match(/^[\p{L}_][\p{L}\p{N}\p{M}_]*/u);
  const match = explicit ?? bare;
  if (match == null) return null;
  const name = explicit ? explicit[1]! : match[0];
  const key = normalizeVariableLookupKey(name);
  // Probe values only identify references in the resulting AST; they are never evaluated.
  const value =
    env.variableMode === 'probe'
      ? 0
      : env.variables && Object.prototype.hasOwnProperty.call(env.variables, key)
        ? env.variables[key]
        : undefined;
  if (value == null || !Number.isFinite(value)) return null;
  return [
    { type: 'Variable', name, value },
    { ...state, rest: state.rest.slice(match[0].length) },
  ];
});

const chainl1 = <T, O>(op: P<O>, p: () => P<T>, cons: (op: O, l: T, r: T) => T): P<T> =>
  new P((state, env) => {
    const rest = (l: T): P<T> =>
      new P((state, env) => {
        const restExpr: P<T> = spaces
          .with(op.skip(spaces).and(p()))
          .then(([[op, r], state], env) => {
            return rest(cons(op, l, r)).run(state, env);
          });
        return maybe(restExpr)
          .map((node) => node ?? l)
          .run(state, env);
      });

    const result = p().run(state, env);
    if (result == null) {
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

const min: P<ExprNode> = regex(/^[Mm][Ii][Nn]\s*/)
  .then(([_, state], env) => atom().run(state, env))
  .map((node) => ExprMinMax(node, 'Min'));

const max: P<ExprNode> = regex(/^[Mm][Aa][Xx]\s*/)
  .then(([_, state], env) => atom().run(state, env))
  .map((node) => ExprMinMax(node, 'Max'));

const subExprMapper = (node: ExprNode): ExprOf<'SubExpr'> =>
  node.type === 'SubExpr' ? node : { type: 'SubExpr', node };

const subExprPureMapper = (node: PureExprNode): PureExprOf<'SubExpr'> =>
  node.type === 'SubExpr' ? node : { type: 'SubExpr', node };

const atom = (): P<ExprNode> => {
  const subExpr = choice([
    regex(/^\(\s*/)
      .with(expr())
      .skip(regex(/^\s*\)/))
      .map(subExprMapper), // match (...)
    regex(/^（\s*/)
      .with(expr())
      .skip(regex(/^\s*）/))
      .map(subExprMapper), // match （...）
    regex(/^\[\s*/)
      .with(expr())
      .skip(regex(/^\s*]/))
      .map(subExprMapper), // match [...]
  ]);
  return choice([srRoll, roll, cocRoll, fateRoll, wodRoll, repeat(), num, subExpr, variable]);
};

const atomPure = (): P<PureExprNode> => {
  const subExpr = choice<PureExprNode>([
    regex(/^\(\s*/)
      .with(exprPure())
      .skip(regex(/^\s*\)/))
      .map(subExprPureMapper), // match (...)
    regex(/^（\s*/)
      .with(exprPure())
      .skip(regex(/^\s*）/))
      .map(subExprPureMapper), // match （...）
    regex(/^\[\s*/)
      .with(exprPure())
      .skip(regex(/^\s*]/))
      .map(subExprPureMapper), // match [...]
  ]);
  return choice<PureExprNode>([num, subExpr, variable]);
};

const repeat = (): P<ExprNode> =>
  regex(/^(\d{1,2})#/).then(([match, state], env) => {
    const count = parseInt(match[1]!);
    if (count === 0) {
      return null;
    }
    const result = expr().run(state, env);
    if (result == null) {
      return null;
    }
    const [node, next] = result;
    return [
      {
        type: 'Repeat',
        node,
        count,
      },
      next,
    ];
  });

const expr2 = (): P<ExprNode> =>
  chainl1<ExprNode, Operator>(operator2, atom, (op, l, r) => ({ type: 'Binary', l, r, op }));
const expr = (): P<ExprNode> =>
  chainl1<ExprNode, Operator>(operator1, expr2, (op, l, r) => ({ type: 'Binary', l, r, op }));

const exprPure2 = (): P<PureExprNode> =>
  chainl1<PureExprNode, Operator>(operator2, atomPure, (op, l, r) => ({
    type: 'Binary',
    l,
    r,
    op,
  }));
const exprPure = (): P<PureExprNode> =>
  chainl1<PureExprNode, Operator>(operator1, exprPure2, (op, l, r) => ({
    type: 'Binary',
    l,
    r,
    op,
  }));

const EXPRESSION = /^{(.+?)}|^【(.+?)】|^｛(.+?)｝/;
const expression: P<Entity> = regex(EXPRESSION).then(([match, { text, rest }], env) => {
  const [entire, a, b, c] = match;
  const content = a || b || c;
  if (!content) {
    return null;
  }
  const exprResult = expr().run({ text: '', rest: content }, env);
  if (!exprResult) {
    return null;
  }
  const [node, exprState] = exprResult;
  if (exprState.rest !== '') {
    return null;
  }
  const entity: EntityOf<'Expr'> = {
    type: 'Expr',
    start: text.length,
    len: entire.length,
    node,
  };
  return [entity, { text: text + entire, rest }];
});

const exprNodeToEntity =
  (state: State) =>
  ([node, next]: [ExprNode, State]): [Entity, State] => {
    const offset = state.rest.length - next.rest.length;
    const consumed = state.rest.substring(0, offset);
    const entity: EntityOf<'Expr'> = {
      type: 'Expr',
      start: state.text.length,
      len: offset,
      node,
    };
    return [entity, { text: state.text + consumed, rest: next.rest }];
  };

const entity = choice<Entity>([
  codeBlock,
  code,
  strongEmphasis,
  strong,
  emphasis,
  link,
  autoUrl,
  expression,
  span,
]);

const message: P<Entity[]> = many(entity).map((entityList) =>
  entityList.reduce(mergeTextEntitiesReducer, []),
);

const checkCommand: P<Entity[]> = new P((state, env) => {
  const result = exprPure().run(state, env);
  if (result == null) {
    return message.run(state, env);
  }
  const [target, next] = result;
  const [entity, after] = exprNodeToEntity(state)([
    { type: 'CocRoll', subType: 'NORMAL', target },
    next,
  ]);
  const remainder = message.run(after, env);
  return remainder == null ? [[entity], after] : [[entity, ...remainder[0]], remainder[1]];
});

const rollCommand: P<Entity[]> = new P((state, env) => {
  const exprEntity = new P((state, env) => {
    const result = expr().run(state, env);
    if (result == null) {
      return null;
    }
    return exprNodeToEntity(state)(result);
  });
  const entity = choice<Entity>([
    codeBlock,
    code,
    strongEmphasis,
    strong,
    emphasis,
    link,
    autoUrl,
    expression,
    exprEntity,
    span,
  ]);
  const message = many(entity).map((entityList) => entityList.reduce(mergeTextEntitiesReducer, []));
  return message.run(state, env);
});

const mergeTextEntitiesReducer = (entities: Entity[], entity: Entity) => {
  if (entity.type !== 'Text') {
    entities.push(entity);
  } else if (entities.length === 0) {
    entities.push(entity);
    return entities;
  } else {
    const last = entities[entities.length - 1]!;
    if (last.type === 'Text') {
      last.len += entity.len;
    } else {
      entities.push(entity);
    }
  }
  return entities;
};

export const parseMessageContent = (
  state: State,
  mode: 'message' | 'roll' | 'check',
  env: MessageParseEnv = defaultMessageParseEnv,
  variableMode: 'resolve' | 'probe' = 'resolve',
): [Entity[], State] | null => {
  const parser = mode === 'check' ? checkCommand : mode === 'roll' ? rollCommand : message;
  return parser.run(state, { ...env, variableMode });
};

interface MeModifier {
  type: 'Me';
  start: number;
  len: number;
}

interface RollModifier {
  type: 'Roll';
  start: number;
  len: number;
}
interface CheckModifier {
  type: 'Check';
  start: number;
  len: number;
}
interface WhisperModifier {
  type: 'Whisper';
  usernames: string[];
  roll?: boolean;
  start: number;
  len: number;
}

interface InGameModifier {
  type: 'InGame';
  start: number;
  len: number;
  inGame: boolean;
  characterName: string;
}

interface AsModifier {
  type: 'As';
  start: number;
  len: number;
  inGame: true;
  target: AsTarget | null;
}

interface MuteModifier {
  type: 'Mute';
  start: number;
  len: number;
}

export type Modifier =
  | MeModifier
  | RollModifier
  | CheckModifier
  | WhisperModifier
  | MuteModifier
  | InGameModifier
  | AsModifier;

const MAX_CHARACTER_NAME_LENGTH = 32;
export const MAX_CHARACTER_IDENTIFIER_LENGTH = 64;

const meModifier: P<Modifier> = regex(/^[.。]me\b/i).then(([match, { text, rest }]) => {
  const [entire] = match;
  const modifier: MeModifier = {
    type: 'Me',
    start: text.length,
    len: entire.length,
  };
  text += entire;
  return [modifier, { text, rest }];
});

const rollModifier: P<Modifier> = regex(/^[.。]r/i).then(([match, { text, rest }]) => {
  const [entire] = match;
  const modifier: RollModifier = {
    type: 'Roll',
    start: text.length,
    len: entire.length,
  };
  text += entire;
  return [modifier, { text, rest }];
});

const checkModifier: P<Modifier> = regex(/^[.。]ra/i).then(([match, { text, rest }]) => {
  const entire = match[0];
  return [
    { type: 'Check', start: text.length, len: entire.length },
    { text: text + entire, rest },
  ];
});

const mentionList: P<{ start: number; len: number; usernames: string[] }> = regex(
  /^\(\s*(.*?)\)\s*|^（\s*(.*?)）\s*/,
).then(([match, { text, rest }], env) => {
  const [entire, a, b] = match;
  const content = a || b;
  if (!content) {
    return [
      { start: text.length, len: entire.length, usernames: [] },
      { text: text + entire, rest },
    ];
  }
  const result = many(mention).run({ text: '', rest: content }, env);
  if (!result) {
    return null;
  }
  const [usernames] = result;
  return [
    { start: text.length, len: entire.length, usernames },
    { text: text + entire, rest },
  ];
});

const whisperModifier: P<WhisperModifier> = regex(/^[.。](r)h\b|^[.。]h(r)?\b/i).then(
  ([match, state], env) => {
    const [entire, g1, g2] = match;
    const rollMatch = g1 || g2 || '';
    const roll = rollMatch.toLowerCase() === 'r';
    const memtionListResult = mentionList.run({ text: state.text + entire, rest: state.rest }, env);
    if (!memtionListResult) {
      const modifier: WhisperModifier = {
        type: 'Whisper',
        start: state.text.length,
        usernames: [],
        roll,
        len: entire.length,
      };
      return [modifier, { text: state.text + entire, rest: state.rest }];
    } else {
      const [mentionList, state2] = memtionListResult;
      const modifier: WhisperModifier = {
        type: 'Whisper',
        start: state.text.length,
        usernames: mentionList.usernames,
        roll,
        len: entire.length + mentionList.len,
      };
      return [modifier, state2];
    }
  },
);

const muteModifier: P<Modifier> = regex(/^[.。]mute\b/i).then(([match, { text, rest }]) => {
  const [entire] = match;
  const modifier: MuteModifier = {
    type: 'Mute',
    start: text.length,
    len: entire.length,
  };
  text += entire;
  return [modifier, { text, rest }];
});

const inGameModifier: P<Modifier> = regex(/^[.。]in\b/i).then(([match, { text, rest }]) => {
  const [entire] = match;

  const modifier: InGameModifier = {
    type: 'InGame',
    start: text.length,
    len: entire.length,
    inGame: true,
    characterName: '',
  };
  text += entire;
  return [modifier, { text, rest }];
});

const outGameModifier: P<Modifier> = regex(/^[.。]out\b/i).then(([match, { text, rest }]) => {
  const [entire] = match;

  const modifier: InGameModifier = {
    type: 'InGame',
    start: text.length,
    len: entire.length,
    inGame: false,
    characterName: '',
  };
  text += entire;
  return [modifier, { text, rest }];
});

const asModifier: P<Modifier> = new P(({ text, rest }) => {
  const start = text.length;
  const prefix = rest.match(/^[.。]as\b/i);
  if (!prefix) return null;
  const afterPrefix = rest.slice(prefix[0].length);
  const matchName = afterPrefix.match(/^[^\S\r\n]*([^;；\r\n]+?)[^\S\r\n]*?(?:[;；]|\r?\n)/);
  const characterName = matchName?.[1]?.trim() ?? '';
  const maxLength = characterName.startsWith('@')
    ? MAX_CHARACTER_IDENTIFIER_LENGTH + 1
    : MAX_CHARACTER_NAME_LENGTH;
  if (!matchName || characterName === '' || characterName.length > maxLength) {
    const consumedLen = prefix[0].length;
    const modifier: AsModifier = {
      type: 'As',
      start,
      len: consumedLen,
      inGame: true,
      target: null,
    };
    return [
      modifier,
      {
        text: text + rest.slice(0, consumedLen),
        rest: rest.slice(consumedLen),
      },
    ];
  }
  const consumedLen = prefix[0].length + matchName[0].length;
  const modifier: AsModifier = {
    type: 'As',
    start,
    len: consumedLen,
    inGame: true,
    target:
      characterName === '@'
        ? { type: 'DefaultCharacter' }
        : characterName.startsWith('@')
          ? { type: 'CharacterReference', identifier: characterName.slice(1) }
          : { type: 'TemporaryName', name: characterName },
  };
  return [
    modifier,
    {
      text: text + rest.slice(0, consumedLen),
      rest: rest.slice(consumedLen),
    },
  ];
});

interface ParseModifersResult {
  text: string;
  rest: string;
  action: MeModifier | false;
  mute: MuteModifier | false;
  whisper: WhisperModifier | false;
  isRoll: boolean;
  isCheck: boolean;
  inGame: InGameModifier | AsModifier | false;
  isWhisper: boolean;
  as: AsModifier | false;
  characterName: string;
  asTarget: AsTarget | null;
  modifiers: Modifier[];
}

export const parseModifiers = (
  source: string,
  env: MessageParseEnv = defaultMessageParseEnv,
): ParseModifersResult => {
  const state: State = { text: '', rest: source };
  const parser: P<Modifier[]> = many(
    spaces
      .with(
        choice([
          meModifier,
          whisperModifier,
          checkModifier,
          rollModifier,
          inGameModifier,
          outGameModifier,
          asModifier,
          muteModifier,
        ]),
      )
      .skip(spaces),
  );

  const result = parser.run(state, env);

  if (!result) {
    throw Error('Failed to parse the source: ' + source);
  }
  const [modifiers, { text, rest }] = result;
  const action = modifiers.find((modifier) => modifier.type === 'Me') || false;
  const mute = modifiers.find((modifier) => modifier.type === 'Mute') || false;
  const asCommand = modifiers.find((modifier) => modifier.type === 'As') || false;
  const inGame = asCommand || modifiers.find((modifier) => modifier.type === 'InGame') || false;
  const isRoll = modifiers.some(
    (modifier) =>
      modifier.type === 'Roll' ||
      modifier.type === 'Check' ||
      (modifier.type === 'Whisper' && modifier.roll),
  );
  const whisper = modifiers.find((modifier) => modifier.type === 'Whisper') || false;
  const isWhisper = modifiers.some((modifier) => modifier.type === 'Whisper');
  return {
    text,
    rest,
    action,
    isRoll,
    isCheck: modifiers.some((modifier) => modifier.type === 'Check'),
    isWhisper,
    mute,
    whisper,
    inGame,
    as: asCommand,
    characterName:
      asCommand && asCommand.target?.type === 'TemporaryName' ? asCommand.target.name : '',
    asTarget: asCommand ? asCommand.target : null,
    modifiers,
  };
};
