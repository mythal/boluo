import { WritableAtom } from 'jotai';
import { createContext, useContext } from 'react';
import { ComposeActionUnion } from '../state/actions/compose';
import { ComposeState } from '../state/compose';

export type ComposeAtom = WritableAtom<ComposeState, [ComposeActionUnion], void>;

export const ComposeAtomContext = createContext<ComposeAtom | null>(null);

export const useComposeAtom = (): ComposeAtom => {
  const composeAtom = useContext(ComposeAtomContext);
  if (composeAtom === null) {
    throw new Error('Access compose atom outside context');
  }
  return composeAtom;
};
