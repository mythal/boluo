import { Atom, atom, PrimitiveAtom, WritableAtom } from 'jotai';
import { atomWithReducer, atomWithStorage, loadable, selectAtom } from 'jotai/utils';
import { createContext, useContext } from 'react';
import { asyncParse } from '../interpreter/async-parse';
import { initParseResult, ParseResult } from '../interpreter/parse-result';
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
  parsedAtom: Atom<ParseResult>;
  isActionAtom: Atom<boolean>;
  broadcastAtom: Atom<boolean>;
  isWhisperAtom: Atom<boolean>;
  filterAtom: PrimitiveAtom<ChannelFilter>;
  showArchivedAtom: PrimitiveAtom<boolean>;
  memberListStateAtom: PrimitiveAtom<ChannelMemberListState>;
}

export const ChannelAtomsContext = createContext<ChannelAtoms | null>(null);

export const makeChannelAtoms = (channelId: string): ChannelAtoms => {
  const composeAtom = atomWithReducer(makeInitialComposeState(), composeReducer);
  const checkComposeAtom: Atom<ComposeError | null> = selectAtom(composeAtom, checkCompose);
  const loadableParsedAtom = loadable(
    atom(async (get, { signal }): Promise<ParseResult> => {
      const { source } = get(composeAtom);
      return await asyncParse(source, signal);
    }),
  );
  let cachedParseResult: ParseResult = initParseResult;
  const parsedAtom = atom((get) => {
    const loadableParsed = get(loadableParsedAtom);
    if (loadableParsed.state === 'hasData') {
      cachedParseResult = loadableParsed.data;
    }
    return cachedParseResult;
  });
  const broadcastAtom = selectAtom(parsedAtom, ({ broadcast }) => broadcast);
  const isActionAtom = selectAtom(parsedAtom, ({ isAction }) => isAction);
  const isWhisperAtom = selectAtom(parsedAtom, ({ isWhisper }) => isWhisper);
  return {
    composeAtom,
    checkComposeAtom,
    parsedAtom,
    isActionAtom,
    broadcastAtom,
    isWhisperAtom,
    filterAtom: atomWithStorage<ChannelFilter>(`${channelId}:filter`, 'ALL'),
    showArchivedAtom: atomWithStorage(`${channelId}:show-archived`, false),
    memberListStateAtom: atom<ChannelMemberListState>('CLOSED'),
  };
};

export const useChannelAtoms = (): ChannelAtoms => {
  const atoms = useContext(ChannelAtomsContext);
  if (atoms === null) {
    throw new Error('Access channel atoms outside context');
  }
  return atoms;
};
