import type { PrimitiveAtom, WritableAtom } from 'jotai';
import { createContext, useContext } from 'react';
import type { ComposeActionUnion } from '../state/compose.actions';
import type { ComposeState } from '../state/compose.reducer';

export type ChannelFilter = 'ALL' | 'IN_GAME' | 'OOC';

export interface ChannelAtoms {
  composeAtom: WritableAtom<ComposeState, [ComposeActionUnion], void>;
  filterAtom: PrimitiveAtom<ChannelFilter>;
  showArchivedAtom: PrimitiveAtom<boolean>;
}

export const ChannelAtomsContext = createContext<ChannelAtoms | null>(null);

export const useChannelAtoms = (): ChannelAtoms => {
  const atoms = useContext(ChannelAtomsContext);
  if (atoms === null) {
    throw new Error('Access compose atom outside context');
  }
  return atoms;
};
