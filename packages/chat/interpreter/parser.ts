/* eslint-disable @typescript-eslint/no-unused-vars,@typescript-eslint/no-use-before-define */
import {
  Binary,
  CocRoll,
  Code,
  CodeBlock,
  DicePool,
  Emphasis,
  Entity,
  Expr,
  ExprNode,
  FateRoll,
  Link,
  Num,
  Operator,
  Roll,
  Strong,
  SubExpr,
  Text,
} from './entities';
import type { ParseResult } from './parse-result';

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

const regex = (pattern: RegExp, consume = false): P<RegExpMatchArray> =>
  new P(({ text, rest }) => {
    const match = rest.match(pattern);
    if (!match) {
      return null;
    }
    const matched = match[0];
    rest = rest.substring(matched.length);
    return [match, { text: consume ? text + matched : text, rest }];
  });

// Parsers

const EM_REGEX = /^\*(.+?)\*/;

const emphasis: P<Entity> = regex(EM_REGEX).then(([match, { text, rest }]) => {
  const [entire, content = ''] = match;
  const entity: Emphasis = {
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
  const entity: Code = {
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
  const entity: CodeBlock = {
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
  const entity: Strong = {
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

const URL_REGEX = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/;

const autoUrl: P<Entity> = regex(URL_REGEX).then(([match, { text, rest }]) => {
  const [content] = match;
  const entity: Link = {
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
const TEXT_REGEX = /\d+|\s(?=\S)|[，。、)）」】\]：！？]+\s*|[\s\S][^\d*{【@[(/（#\s，。、）)」】\]：！？]*\s*/;

const span: P<Text> = regex(TEXT_REGEX).then(([match, { text, rest }]) => {
  const [content] = match;
  const offset = content.length;
  const entity: Text = {
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
    console.warn('Failed to parse username: ' + entire);
    return null;
  }
  return [username, { text: text + entire, rest }];
});

const LINK_REGEX = /^\[(.+?)]\(([^)]+?)\)/;
const link: P<Entity> = regex(LINK_REGEX).then(([match, { text, rest }]) => {
  const [entire, content = '', link = ''] = match;
  let href: Link['href'];
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

  const entity: Link = {
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

const spaces: P<null> = regex(/^\s*/).then(([match, state]) => {
  return [null, {
    text: state.text + match[0],
    rest: state.rest,
  }];
});

const fateRoll: P<FateRoll> = regex(/^([Ff][Aa][Tt][Ee]|dF)\s*/).map(() => {
  return { type: 'FateRoll' };
});

const srRoll: P<DicePool> = regex(/^sr(p?)\s*(\d+)\s*/).then(([match, state]) => {
  const push = Boolean(match[1]);
  const counterStr = match[2];
  if (!counterStr) {
    return null;
  }
  const counter = parseInt(counterStr);
  if (counter < 1) {
    return null;
  }
  const node: DicePool = {
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

const wodRoll: P<DicePool> = regex(/^[wW](?:_(\d))?\s*(\d{1,3})\s*/).then(([match, state], env) => {
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
  const node: DicePool = {
    type: 'DicePool',
    counter,
    face: 10,
    min: 8,
    addition,
    fumble: 1,
    critical: 10,
  };
  return [node, state];
});

const cocRoll: P<CocRoll> = regex(/^[Cc][Oo][Cc]([Bb][Bb]?|[Pp][Pp]?)?\s*/).then(([[entire, modifier], state], env) => {
  modifier = (modifier || '').toLowerCase();
  let subType: CocRoll['subType'] = 'NORMAL';
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
  const node: CocRoll = {
    type: 'CocRoll',
    subType,
  };
  const right = atom(true).run(state, env);
  if (right) {
    const [target, state] = right;
    node.target = target;
    return [node, state];
  }
  return [node, state];
});

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
    const node: Roll = {
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

const operator1: P<Operator> = regex(/^[-+]/).map(
  ([op]): Operator => {
    if (op === '+') {
      return '+';
    } else if (op === '-') {
      return '-';
    }
    throw Error('unreachable');
  },
);

const operator2: P<Operator> = regex(/^[*/×÷]/).map(
  ([op]): Operator => {
    if (op === '×' || op === '*') {
      return '×';
    } else if (op === '÷' || op === '/') {
      return '÷';
    }
    throw Error('unreachable');
  },
);

const num: P<ExprNode> = regex(/^\d{1,5}/).map(([n]): Num => ({ type: 'Num', value: Number(n) }));

const chainl1 = <T, O>(op: P<O>, p: () => P<T>, cons: (op: O, l: T, r: T) => T): P<T> =>
  new P((state, env) => {
    const rest = (l: T): P<T> =>
      new P((state, env) => {
        const restExpr: P<T> = spaces.with(op.skip(spaces).and(p())).then(([[op, r], state], env) => {
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

const min: P<ExprNode> = regex(/^[Mm][Ii][Nn]\s*/)
  .then(([_, state], env) => atom().run(state, env))
  .map((node) => ExprMinMax(node, 'Min'));

const max: P<ExprNode> = regex(/^[Mm][Aa][Xx]\s*/)
  .then(([_, state], env) => atom().run(state, env))
  .map((node) => ExprMinMax(node, 'Max'));

const subExprMapper = (node: ExprNode): SubExpr => (node.type === 'SubExpr' ? node : { type: 'SubExpr', node });

const atom = (disableRoll = false): P<ExprNode> => {
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
  if (disableRoll) {
    return choice([num, subExpr]);
  }
  return choice([srRoll, roll, cocRoll, fateRoll, wodRoll, repeat(), num, subExpr]);
};

const repeat = (): P<ExprNode> =>
  regex(/^(\d{1,2})#/).then(([match, state], env) => {
    const count = parseInt(match[1]!);
    if (count === 0) {
      return null;
    }
    const result = expr().run(state, env);
    if (result === null) {
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

const logResult = <T>(result: T): T => {
  console.log(result);
  return result;
};

const expr2 = (): P<ExprNode> =>
  chainl1<ExprNode, Operator>(operator2, atom, (op, l, r) => ({ type: 'Binary', l, r, op }));
const expr = (): P<ExprNode> =>
  chainl1<ExprNode, Operator>(operator1, expr2, (op, l, r) => ({ type: 'Binary', l, r, op }));

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
  const entity: Expr = {
    type: 'Expr',
    start: text.length,
    len: entire.length,
    node,
  };
  return [entity, { text: text + entire, rest }];
});

const exprNodeToEntity = (state: State) => ([node, next]: [ExprNode, State]): [Entity, State] => {
  const offset = state.rest.length - next.rest.length;
  const consumed = state.rest.substring(0, offset);
  const entity: Expr = {
    type: 'Expr',
    start: state.text.length,
    len: offset,
    node,
  };
  return [entity, { text: state.text + consumed, rest: next.rest }];
};

const ROLL_COMMAND = /^[.。]r\s*/;

const entity = choice<Entity>([codeBlock, code, strong, emphasis, link, autoUrl, expression, span]);

const message: P<Entity[]> = many(entity).map((entityList) => entityList.reduce(mergeTextEntitiesReducer, []));

const rollCommand: P<Entity[]> = new P((state, env) => {
  const exprEntity = new P((state, env) => {
    const result = expr().run(state, env);
    if (result === null) {
      return null;
    }
    return exprNodeToEntity(state)(result);
  });
  const entity = choice<Entity>([codeBlock, code, strong, emphasis, link, autoUrl, expression, exprEntity, span]);
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

export const parse = (source: string, parseExpr = true, env: Env = emptyEnv): ParseResult => {
  const modifiersParseResult = parseModifiers(source, env);
  const { action, isRoll, mute, whisper, inGame } = modifiersParseResult;
  let state: State = { text: modifiersParseResult.text, rest: modifiersParseResult.rest };

  let result: [Entity[], State] | null = null;
  if (modifiersParseResult.rest.length === 0) {
    result = [[], state];
  } else if (isRoll) {
    result = rollCommand.run(state, env);
  } else {
    result = message.run(state, env);
  }

  if (!result) {
    throw Error('Failed to parse the source: ' + source);
  }
  const [entities, nextState] = result;
  state = nextState;
  return {
    text: state.text,
    entities,
    isRoll,
    inGame: inGame ? inGame.inGame : null,
    characterName: '',
    isAction: Boolean(action),
    whisperToUsernames: whisper ? whisper.usernames : null,
    broadcast: !mute,
  };
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

interface MuteModifier {
  type: 'Mute';
  start: number;
  len: number;
}

export type Modifier =
  | MeModifier
  | RollModifier
  | WhisperModifier
  | MuteModifier
  | InGameModifier;

const meModifier: P<Modifier> = regex(/^[.。][mM][eE]\s*/).then(([match, { text, rest }]) => {
  const [entire] = match;
  const modifier: MeModifier = {
    type: 'Me',
    start: text.length,
    len: entire.length,
  };
  text += entire;
  return [modifier, { text, rest }];
});

const rollModifier: P<Modifier> = regex(/^[.。][rR]\s*/).then(([match, { text, rest }]) => {
  const [entire] = match;
  const modifier: RollModifier = {
    type: 'Roll',
    start: text.length,
    len: entire.length,
  };
  text += entire;
  return [modifier, { text, rest }];
});

const mentionList: P<{ start: number; len: number; usernames: string[] }> = regex(/^\(\s*(.*?)\)\s*|^（\s*(.*?)）\s*/)
  .then(([match, { text, rest }], env) => {
    const [entire, a, b] = match;
    const content = a || b;
    if (!content) {
      return [{ start: text.length, len: entire.length, usernames: [] }, { text: text + entire, rest }];
    }
    const result = many(mention).run({ text: '', rest: content }, env);
    if (!result) {
      return null;
    }
    const [usernames] = result;
    return [{ start: text.length, len: entire.length, usernames }, { text: text + entire, rest }];
  });

const whisperModifier: P<WhisperModifier> = regex(/^[.。]([rR])[hH]\s*|^[.。][hH]([rR])?\s*/).then(
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

const muteModifier: P<Modifier> = regex(/^[.。][mM][uU][tT][eE]\s*/).then(([match, { text, rest }]) => {
  const [entire] = match;
  const modifier: MuteModifier = {
    type: 'Mute',
    start: text.length,
    len: entire.length,
  };
  text += entire;
  return [modifier, { text, rest }];
});

const inOutGameModifier: P<Modifier> = regex(/^[.。](in)[\s$]|[.。](out)[\s$]/i).then(([match, { text, rest }]) => {
  const [entire, inGame = ''] = match;

  const modifier: InGameModifier = {
    type: 'InGame',
    start: text.length,
    len: entire.length,
    inGame: inGame.toLowerCase() === 'in',
    characterName: '',
  };
  text += entire;
  return [modifier, { text, rest }];
});

interface ParseModifersResult {
  text: string;
  rest: string;
  action: MeModifier | false;
  mute: MuteModifier | false;
  whisper: WhisperModifier | false;
  isRoll: boolean;
  inGame: InGameModifier | false;
  isWhisper: boolean;
}

export const parseModifiers = (source: string, env: Env = emptyEnv): ParseModifersResult => {
  const state: State = { text: '', rest: source };
  const parser: P<Modifier[]> = many(
    spaces.with(choice([meModifier, whisperModifier, rollModifier, muteModifier, inOutGameModifier])),
  );

  const result = parser.run(state, env);

  if (!result) {
    throw Error('Failed to parse the source: ' + source);
  }
  const [modifiers, { text, rest }] = result;
  const action = modifiers.find((modifier): modifier is MeModifier => modifier.type === 'Me') || false;
  const mute = modifiers.find((modifier): modifier is MuteModifier => modifier.type === 'Mute') || false;
  const inGame = modifiers.find((modifier): modifier is InGameModifier => modifier.type === 'InGame') || false;
  const isRoll = modifiers.some((modifier) =>
    modifier.type === 'Roll' || (modifier.type === 'Whisper' && modifier.roll)
  );
  const whisper = modifiers.find((modifier): modifier is WhisperModifier => modifier.type === 'Whisper') || false;
  const isWhisper = modifiers.some((modifier) => modifier.type === 'Whisper');
  return {
    text,
    rest,
    action,
    isRoll,
    isWhisper,
    mute,
    whisper,
    inGame,
  };
};
