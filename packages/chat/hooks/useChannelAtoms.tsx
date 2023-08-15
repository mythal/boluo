import { Atom, atom, PrimitiveAtom, WritableAtom } from 'jotai';
import { atomWithReducer, atomWithStorage, selectAtom } from 'jotai/utils';
import { createContext, useContext } from 'react';
import type { ComposeActionUnion } from '../state/compose.actions';
import {
  checkCompose,
  ComposeError,
  composeReducer,
  ComposeState,
  makeInitialComposeState,
} from '../state/compose.reducer';

export type ChannelFilter = 'ALL' | 'IN_GAME' | 'OOC';

export type ChannelMemberListState = 'CLOSED' | 'RIGHT';

export interface ChannelAtoms {
  composeAtom: WritableAtom<ComposeState, [ComposeActionUnion], void>;
  checkComposeAtom: Atom<ComposeError | null>;
  filterAtom: PrimitiveAtom<ChannelFilter>;
  showArchivedAtom: PrimitiveAtom<boolean>;
  memberListStateAtom: PrimitiveAtom<ChannelMemberListState>;
}

export const ChannelAtomsContext = createContext<ChannelAtoms | null>(null);

export const makeChannelAtoms = (channelId: string): ChannelAtoms => {
  const composeAtom = atomWithReducer(makeInitialComposeState(), composeReducer);
  const checkComposeAtom: Atom<ComposeError | null> = selectAtom(composeAtom, checkCompose);
  return {
    composeAtom,
    checkComposeAtom,
    filterAtom: atomWithStorage<ChannelFilter>(`${channelId}:filter`, 'ALL'),
    showArchivedAtom: atomWithStorage(`${channelId}:show-archived`, false),
    memberListStateAtom: atom<ChannelMemberListState>('CLOSED'),
  };
};

export const useChannelAtoms = (): ChannelAtoms => {
  const atoms = useContext(ChannelAtomsContext);
  if (atoms === null) {
    throw new Error('Access compose atom outside context');
  }
  return atoms;
};
