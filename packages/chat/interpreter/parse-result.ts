import type { Entity } from './entities';

export interface ParseResult {
  text: string;
  entities: Entity[];
  isAction: boolean;
  isRoll: boolean;
  isWhisper: boolean;
  broadcast: boolean;
}

export const initParseResult: ParseResult = {
  text: '',
  entities: [],
  isAction: false,
  isRoll: false,
  isWhisper: false,
  broadcast: false,
};
