import type { Entity } from './entities';

export interface ParseResult {
  text: string;
  entities: Entity[];
  isAction: boolean;
  isRoll: boolean;
  whisperToUsernames: string[] | null;
  broadcast: boolean;
}

export const initParseResult: ParseResult = {
  text: '',
  entities: [],
  isAction: false,
  isRoll: false,
  whisperToUsernames: null,
  broadcast: false,
};
