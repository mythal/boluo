import type { Entity } from './entities';

export interface ParseResult {
  text: string;
  entities: Entity[];
  isAction: boolean;
  isRoll: boolean;
  inGame: boolean | null;
  characterName: string;
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
  whisperToUsernames: null,
  broadcast: false,
};
