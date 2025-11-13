import { type Atom, atom, type PrimitiveAtom, type WritableAtom } from 'jotai';
import { atomWithStorage, loadable, selectAtom } from 'jotai/utils';
import { createContext, useContext, useMemo, useRef } from 'react';
import { asyncParse } from '../interpreter/async-parse';
import { composeInitialParseResult, type ParseResult } from '../interpreter/parse-result';
import type { ComposeActionUnion } from '../state/compose.actions';
import { checkCompose, type ComposeError, type ComposeState } from '../state/compose.reducer';
import { usePaneKey } from './usePaneKey';
import { composeAtomFamily } from '../state/compose.atoms';

export type ChannelFilter = 'ALL' | 'IN_GAME' | 'OOC';

export type ChannelMemberListState = 'CLOSED' | 'RIGHT';

export interface ChannelAtoms {
  composeAtom: WritableAtom<ComposeState, [ComposeActionUnion], void>;
  checkComposeAtom: Atom<ComposeError | null>;
  parsedAtom: Atom<ParseResult>;
  composeFocusedAtom: Atom<boolean>;
  isActionAtom: Atom<boolean>;
  hasMediaAtom: Atom<boolean>;
  broadcastAtom: Atom<boolean>;
  hideSelfPreviewTimeoutAtom: PrimitiveAtom<number>;
  inputedNameAtom: Atom<string>;
  isWhisperAtom: Atom<boolean>;
  inGameAtom: Atom<boolean>;
  isEditingAtom: Atom<boolean>;
  filterAtom: PrimitiveAtom<ChannelFilter>;
  showArchivedAtom: PrimitiveAtom<boolean>;
  memberListStateAtom: PrimitiveAtom<ChannelMemberListState>;
  defaultDiceFaceRef: React.RefObject<number>;
}

export const ChannelAtomsContext = createContext<ChannelAtoms | null>(null);

export const useMakeChannelAtoms = (
  channelId: string,
  characterName: string,
  defaultInGame: boolean,
  defaultDiceFace: number,
): ChannelAtoms => {
  const paneKey = usePaneKey();
  if (paneKey == null) {
    throw new Error('Access channel atoms outside pane');
  }
  const defaultDiceFaceRef = useRef(defaultDiceFace);
  defaultDiceFaceRef.current = defaultDiceFace;
  const composeAtom = composeAtomFamily({ channelId, paneKey });
  const checkComposeAtom: Atom<ComposeError | null> = useMemo(
    () => selectAtom(composeAtom, checkCompose(characterName, defaultInGame)),
    [characterName, composeAtom, defaultInGame],
  );
  const cachedParseResultRef = useRef<ParseResult>(composeInitialParseResult);
  const atoms: Omit<ChannelAtoms, 'composeAtom' | 'checkComposeAtom' | 'inGameAtom'> =
    useMemo(() => {
      const sourceAtom = atom((get) => get(composeAtom).source);
      const hideSelfPreviewTimeoutAtom = atom(0);
      const loadableParsedAtom = loadable(
        atom(async (get, { signal }): Promise<ParseResult> => {
          const source = get(sourceAtom);
          return await asyncParse({ source, defaultDiceFace: defaultDiceFaceRef.current }, signal);
        }),
      );
      const parsedAtom = atom((get) => {
        const loadableParsed = get(loadableParsedAtom);
        if (loadableParsed.state === 'hasData') {
          cachedParseResultRef.current = loadableParsed.data;
        }
        return cachedParseResultRef.current;
      });
      const inputedNameAtom = selectAtom(composeAtom, ({ inputedName }) => inputedName);
      const broadcastAtom = selectAtom(parsedAtom, ({ broadcast }) => broadcast);
      const isActionAtom = selectAtom(parsedAtom, ({ isAction }) => isAction);
      const hasMediaAtom = selectAtom(composeAtom, ({ media }) => media != null);
      const isEditingAtom = selectAtom(composeAtom, ({ edit }) => edit != null);
      const isWhisperAtom = selectAtom(
        parsedAtom,
        ({ whisperToUsernames }) => whisperToUsernames != null,
      );
      const composeFocusedAtom = selectAtom(composeAtom, ({ focused }) => focused);
      return {
        composeAtom,
        parsedAtom,
        hideSelfPreviewTimeoutAtom,
        isActionAtom,
        inputedNameAtom,
        hasMediaAtom,
        broadcastAtom,
        isWhisperAtom,
        composeFocusedAtom,
        isEditingAtom,
        filterAtom: atomWithStorage<ChannelFilter>(`${channelId}:filter`, 'ALL'),
        showArchivedAtom: atomWithStorage(`${channelId}:show-archived`, false),
        memberListStateAtom: atom<ChannelMemberListState>('CLOSED'),
        defaultDiceFaceRef,
      };
    }, [channelId, composeAtom]);
  const inGameAtom = useMemo(
    () =>
      atom((read) => {
        const { inGame } = read(atoms.parsedAtom);
        if (inGame == null) {
          return defaultInGame;
        } else {
          return inGame;
        }
      }),
    [atoms.parsedAtom, defaultInGame],
  );
  return { ...atoms, checkComposeAtom, composeAtom, inGameAtom };
};

export const useChannelAtoms = (): ChannelAtoms => {
  const atoms = useContext(ChannelAtomsContext);
  if (atoms == null) {
    throw new Error('Access channel atoms outside context');
  }
  return atoms;
};
