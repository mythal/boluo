import { MakeAction, makeAction } from './actions';

export type ComposeActionMap = {
  setSource: { channelId: string; source: string };
};

export type ComposeActionUnion = MakeAction<ComposeActionMap, keyof ComposeActionMap>;
export type ComposeAction<T extends keyof ComposeActionMap> = MakeAction<ComposeActionMap, T>;

export const makeComposeAction = <A extends ComposeActionUnion>(type: A['type'], payload: A['payload']) => {
  return makeAction<ComposeActionMap, A, undefined>(type, payload, undefined);
};
