import type { Entities } from '@boluo/api';
import type { Modifier } from './parser';

export type AsTarget =
  | { type: 'TemporaryName'; name: string }
  | { type: 'DefaultCharacter' }
  | { type: 'CharacterReference'; identifier: string };

export interface ParseResult {
  text: string;
  entities: Entities;
  isAction: boolean;
  isRoll: boolean;
  inGame: boolean | null;
  /** @deprecated Use `asTarget`; this only contains temporary `.as` names. */
  characterName: string;
  asTarget: AsTarget | null;
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
  asTarget: null,
  modifiers: [],
  whisperToUsernames: null,
  broadcast: false,
};

export const composeInitialParseResult: ParseResult = {
  text: '',
  entities: [],
  isAction: false,
  isRoll: false,
  inGame: null,
  characterName: '',
  asTarget: null,
  modifiers: [],
  whisperToUsernames: null,
  broadcast: false,
};
