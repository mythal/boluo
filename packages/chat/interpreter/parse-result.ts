import type { Entity } from './entities';
import { Modifier } from './parser';

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

export const initParseResult: ParseResult = {
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
