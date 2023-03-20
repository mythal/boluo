import { atomFamily, atomWithReducer } from 'jotai/utils';
import type { ComposeActionUnion } from '../actions/compose';
import { composeReducer, initialComposeState } from '../compose';

export type ComposeDispatch = (action: ComposeActionUnion) => void;

export const composeAtomFamily = atomFamily((channelId: string) => {
  return atomWithReducer(initialComposeState, composeReducer);
});
