import { atomFamily, atomWithReducer } from 'jotai/utils';
import { composeReducer, makeInitialComposeState } from './compose.reducer';

interface Key {
  channelId: string;
  paneKey: number;
}

const areEqual = (a: Key, b: Key) => a.channelId === b.channelId && a.paneKey === b.paneKey;

// TODO: clean up
export const composeAtomFamily = atomFamily(
  (_key: Key) => atomWithReducer(makeInitialComposeState(), composeReducer),
  areEqual,
);
