import { DEFAULT_COMPOSE_SOURCE } from '../const';
import type { Entity } from './entities';
import type { Modifier } from './parser';

export interface ParseResult {
  text: string;
  entities: Entity[];
  isAction: boolean;
  isRoll: boolean;
  inGame: boolean | null;
  characterName: string;
  modifiers: Modifier[];
  whisperToUsernames: string[] | null;
  broadcast: boolean;
}

export const emptyParseResult: ParseResult = {
  text: '',
  entities: [],
  isAction: false,
  isRoll: false,
  inGame: null,
  characterName: '',
  modifiers: [],
  whisperToUsernames: null,
  broadcast: false,
};

export const composeInitialParseResult: ParseResult = {
  text: DEFAULT_COMPOSE_SOURCE,
  entities: [],
  isAction: false,
  isRoll: false,
  inGame: false,
  characterName: '',
  modifiers: [{ type: 'InGame', inGame: false, start: 0, len: 4, characterName: '' }],
  whisperToUsernames: null,
  broadcast: false,
};
