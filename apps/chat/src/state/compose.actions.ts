import { Message } from 'api';
import type { Empty } from 'utils';
import type { ParseResult } from '../interpreter/parser';
import { MakeAction, makeAction } from './actions';
import type { ComposeState } from './compose.reducer';

export type ComposeActionMap = {
  setSource: { channelId: string; source: string };
  setInputedName: { inputedName: string };
  toggleInGame: Empty;
  toggleBroadcast: Empty;
  addDice: Empty;
  link: { text: string; href: string };
  bold: { text: string };
  recoverState: ComposeState;
  parsed: ParseResult;
  editMessage: { message: Message };
  sent: Empty;
  reset: Empty;
  focus: Empty;
  blur: Empty;
  setRange: { range: [number, number] | null };
  toggleAction: Empty;
};

export type ComposeActionUnion = MakeAction<ComposeActionMap, keyof ComposeActionMap>;
export type ComposeAction<T extends keyof ComposeActionMap> = MakeAction<ComposeActionMap, T>;

export const makeComposeAction = <A extends ComposeActionUnion>(type: A['type'], payload: A['payload']) => {
  return makeAction<ComposeActionMap, A, undefined>(type, payload, undefined);
};
