import type { Empty } from 'utils';
import type { ComposeState } from '../compose';
import { MakeAction, makeAction } from './actions';

export type ComposeActionMap = {
  setSource: { channelId: string; source: string; range: [number, number] };
  setInputedName: { inputedName: string };
  toggleInGame: Empty;
  addDice: Empty;
  recoverState: ComposeState;
  setRange: { range: [number, number] | null };
};

export type ComposeActionUnion = MakeAction<ComposeActionMap, keyof ComposeActionMap>;
export type ComposeAction<T extends keyof ComposeActionMap> = MakeAction<ComposeActionMap, T>;

export const makeComposeAction = <A extends ComposeActionUnion>(type: A['type'], payload: A['payload']) => {
  return makeAction<ComposeActionMap, A, undefined>(type, payload, undefined);
};
