import { ChannelMember } from '@boluo/api';
import { Atom, atom, PrimitiveAtom, WritableAtom } from 'jotai';
import { atomWithReducer, atomWithStorage, loadable, selectAtom } from 'jotai/utils';
import { createContext, useContext, useMemo } from 'react';
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
  hasMediaAtom: Atom<boolean>;
  broadcastAtom: Atom<boolean>;
  inputedNameAtom: Atom<string>;
  isWhisperAtom: Atom<boolean>;
  inGameAtom: Atom<boolean>;
  filterAtom: PrimitiveAtom<ChannelFilter>;
  showArchivedAtom: PrimitiveAtom<boolean>;
  memberListStateAtom: PrimitiveAtom<ChannelMemberListState>;
}

export const ChannelAtomsContext = createContext<ChannelAtoms | null>(null);

export const useMakeChannelAtoms = (channelId: string, member: ChannelMember | null): ChannelAtoms => {
  const composeAtom = useMemo(() => atomWithReducer(makeInitialComposeState(), composeReducer), []);
  const checkComposeAtom: Atom<ComposeError | null> = useMemo(
    () => selectAtom(composeAtom, checkCompose(member?.characterName ?? '')),
    [composeAtom, member?.characterName],
  );
  return useMemo(() => {
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
    const inputedNameAtom = selectAtom(composeAtom, ({ inputedName }) => inputedName);
    const broadcastAtom = selectAtom(parsedAtom, ({ broadcast }) => broadcast);
    const isActionAtom = selectAtom(parsedAtom, ({ isAction }) => isAction);
    const hasMediaAtom = selectAtom(composeAtom, ({ media }) => media != null);
    const isWhisperAtom = selectAtom(parsedAtom, ({ whisperToUsernames }) => whisperToUsernames !== null);
    const inGameAtom = atom((read) => {
      const { inGame } = read(parsedAtom);
      const { defaultInGame } = read(composeAtom);
      if (inGame == null) {
        // By default, the `defaultInGame` are set as reverse of
        // the default in/off game command in the compose source.
        return !defaultInGame;
      } else {
        return inGame;
      }
    });
    return {
      composeAtom,
      checkComposeAtom,
      parsedAtom,
      isActionAtom,
      inputedNameAtom,
      hasMediaAtom,
      broadcastAtom,
      isWhisperAtom,
      inGameAtom,
      filterAtom: atomWithStorage<ChannelFilter>(`${channelId}:filter`, 'ALL'),
      showArchivedAtom: atomWithStorage(`${channelId}:show-archived`, false),
      memberListStateAtom: atom<ChannelMemberListState>('CLOSED'),
    };
  }, [channelId, checkComposeAtom, composeAtom]);
};

export const useChannelAtoms = (): ChannelAtoms => {
  const atoms = useContext(ChannelAtomsContext);
  if (atoms === null) {
    throw new Error('Access channel atoms outside context');
  }
  return atoms;
};
