import type { Empty } from 'utils';
import type { ParseResult } from '../interpreter/parser';
import { MakeAction, makeAction } from './actions';
import type { ComposeState } from './compose.reducer';

export type ComposeActionMap = {
  setSource: { channelId: string; source: string };
  setInputedName: { inputedName: string };
  toggleInGame: Empty;
  addDice: Empty;
  link: { text: string; href: string };
  bold: { text: string };
  recoverState: ComposeState;
  parsed: ParseResult;
  setRange: { range: [number, number] | null };
};

export type ComposeActionUnion = MakeAction<ComposeActionMap, keyof ComposeActionMap>;
export type ComposeAction<T extends keyof ComposeActionMap> = MakeAction<ComposeActionMap, T>;

export const makeComposeAction = <A extends ComposeActionUnion>(type: A['type'], payload: A['payload']) => {
  return makeAction<ComposeActionMap, A, undefined>(type, payload, undefined);
};
