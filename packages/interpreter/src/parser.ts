import type { Entity, ExprNode } from '@boluo/api';
import type { ParseResult } from './parse-result';
import type { State } from './parser-combinator';
import {
  defaultMessageParseEnv,
  parseMessageContent,
  parseModifiers,
  type MessageParseEnv,
} from './message-parser';
import { parseStateCommandSyntax } from './state-command';

export {
  parseModifiers,
  MAX_CHARACTER_IDENTIFIER_LENGTH,
  type MessageParseEnv,
  type Modifier,
} from './message-parser';

const parseWithEnv = (
  source: string,
  env: MessageParseEnv,
  variableMode: 'resolve' | 'probe' = 'resolve',
): ParseResult => {
  const modifiersParseResult = parseModifiers(source, env);
  const { action, isRoll, mute, whisper, inGame, modifiers, characterName, asTarget } =
    modifiersParseResult;
  const state: State = { text: modifiersParseResult.text, rest: modifiersParseResult.rest };

  const stateCommand = parseStateCommandSyntax(state.rest, state.text.length);
  let result: [Entity[], State] | null;
  if (stateCommand) {
    result = [
      [{ type: 'Text', start: state.text.length, len: state.rest.length }],
      { text: source, rest: '' },
    ];
  } else {
    const mode = modifiersParseResult.isCheck ? 'check' : isRoll ? 'roll' : 'message';
    result = parseMessageContent(state, mode, env, variableMode);
  }

  if (!result) {
    throw Error('Failed to parse the source: ' + source);
  }
  const [entities, nextState] = result;
  return {
    text: nextState.text,
    entities,
    modifiers,
    isRoll,
    inGame: inGame ? inGame.inGame : null,
    characterName,
    asTarget,
    isAction: Boolean(action),
    whisperToUsernames: whisper ? whisper.usernames : null,
    broadcast: !mute,
    ...(stateCommand ? { stateCommand } : {}),
  };
};

export const parse = (source: string, env: MessageParseEnv = defaultMessageParseEnv): ParseResult =>
  parseWithEnv(source, env);

const containsVariable = (node: ExprNode): boolean => {
  switch (node.type) {
    case 'Variable':
      return true;
    case 'Binary':
      return containsVariable(node.l) || containsVariable(node.r);
    case 'SubExpr':
    case 'Repeat':
      return containsVariable(node.node);
    case 'CocRoll':
      return node.target != null && containsVariable(node.target);
    case 'Num':
    case 'Roll':
    case 'Max':
    case 'Min':
    case 'DicePool':
    case 'FateRoll':
    case 'Unknown':
      return false;
  }
};

export const needsVariableEnvironment = (source: string): boolean => {
  const parsed = parseWithEnv(source, defaultMessageParseEnv, 'probe');
  return parsed.stateCommand
    ? parsed.stateCommand.command != null
    : parsed.entities.some((entity) => entity.type === 'Expr' && containsVariable(entity.node));
};
