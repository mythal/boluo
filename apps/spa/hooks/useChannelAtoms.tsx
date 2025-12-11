import { type Atom, atom, type PrimitiveAtom, type WritableAtom } from 'jotai';
import { atomWithStorage, loadable, selectAtom } from 'jotai/utils';
import { createContext, useContext, useMemo, useRef } from 'react';
import { asyncParse } from '../interpreter/async-parse';
import { composeInitialParseResult, parseModifiers, type ParseResult } from '@boluo/interpreter';
import type { ComposeActionUnion } from '../state/compose.actions';
import { checkCompose, type ComposeError, type ComposeState } from '../state/compose.reducer';
import { usePaneKey } from './usePaneKey';
import { composeAtomFamily } from '../state/compose.atoms';

export type ChannelFilter = 'ALL' | 'IN_GAME' | 'OOC';

export type SubPaneState = 'NONE' | 'MEMBER_LIST' | 'SEARCH';

export interface ScrollToMessageRequest {
  messageId: string;
  archived: boolean;
  inGame: boolean;
  /** The position of the message, used for locating in the list */
  pos: number;
}

export interface ChannelAtoms {
  composeAtom: WritableAtom<ComposeState, [ComposeActionUnion], void>;
  checkComposeAtom: Atom<ComposeError | null>;
  parsedAtom: Atom<ParseResult>;
  composeFocusedAtom: Atom<boolean>;
  isActionAtom: Atom<boolean>;
  hasMediaAtom: Atom<boolean>;
  selfPreviewNamePanelOpenAtom: PrimitiveAtom<boolean>;
  selfPreviewDraftHistoryOpenAtom: PrimitiveAtom<boolean>;
  selfPreviewHideAtAtom: PrimitiveAtom<number | null>;
  selfPreviewHoverAtom: PrimitiveAtom<boolean>;
  selfPreviewShouldHoldAtom: Atom<boolean>;
  selfPreviewVisibleAtom: Atom<boolean>;
  isComposeEmptyAtom: Atom<boolean>;
  broadcastAtom: Atom<boolean>;
  characterNameAtom: Atom<string>;
  isWhisperAtom: Atom<boolean>;
  lastWhisperTargetsAtom: PrimitiveAtom<string[] | null>;
  inGameAtom: Atom<boolean>;
  isEditingAtom: Atom<boolean>;
  filterAtom: PrimitiveAtom<ChannelFilter>;
  showArchivedAtom: PrimitiveAtom<boolean>;
  subPaneStateAtom: PrimitiveAtom<SubPaneState>;
  scrollToMessageAtom: PrimitiveAtom<ScrollToMessageRequest | null>;
  highlightMessageAtom: PrimitiveAtom<string | null>;
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
      const characterNameAtom = selectAtom(composeAtom, ({ source }) => {
        try {
          return parseModifiers(source).characterName;
        } catch {
          return '';
        }
      });
      const broadcastAtom = selectAtom(parsedAtom, ({ broadcast }) => broadcast);
      const isActionAtom = selectAtom(parsedAtom, ({ isAction }) => isAction);
      const hasMediaAtom = selectAtom(composeAtom, ({ media }) => media != null);
      const isEditingAtom = selectAtom(composeAtom, ({ edit }) => edit != null);
      const isWhisperAtom = selectAtom(
        parsedAtom,
        ({ whisperToUsernames }) => whisperToUsernames != null,
      );
      const composeFocusedAtom = selectAtom(composeAtom, ({ focused }) => focused);
      const isComposeEmptyAtom = atom((get) => {
        const compose = get(composeAtom);
        const hasMedia = get(hasMediaAtom);
        return compose.source.trim().length === 0 && !hasMedia;
      });
      const selfPreviewNamePanelOpenAtom = atom<boolean>(false);
      const selfPreviewDraftHistoryOpenAtom = atom<boolean>(false);
      const selfPreviewHideAtAtom = atom<number | null>(null);
      const selfPreviewHoverAtom = atom<boolean>(false);
      const selfPreviewShouldHoldAtom = atom((get) => {
        const focused = get(composeFocusedAtom);
        const isComposeEmpty = get(isComposeEmptyAtom);
        const namePanelOpen = get(selfPreviewNamePanelOpenAtom);
        const draftHistoryOpen = get(selfPreviewDraftHistoryOpenAtom);
        const isEditing = get(isEditingAtom);
        const hovering = get(selfPreviewHoverAtom);
        return (
          !isComposeEmpty || focused || namePanelOpen || draftHistoryOpen || isEditing || hovering
        );
      });
      const selfPreviewVisibleAtom = atom((get) => {
        if (get(selfPreviewShouldHoldAtom)) return true;
        const hideAt = get(selfPreviewHideAtAtom);
        if (hideAt == null) return true;
        // eslint-disable-next-line react-hooks/purity
        return hideAt > Date.now();
      });
      return {
        composeAtom,
        parsedAtom,
        isActionAtom,
        characterNameAtom,
        hasMediaAtom,
        broadcastAtom,
        isWhisperAtom,
        composeFocusedAtom,
        isEditingAtom,
        isComposeEmptyAtom,
        selfPreviewNamePanelOpenAtom,
        selfPreviewDraftHistoryOpenAtom,
        selfPreviewHideAtAtom,
        selfPreviewHoverAtom,
        selfPreviewShouldHoldAtom,
        selfPreviewVisibleAtom,
        lastWhisperTargetsAtom: atomWithStorage<string[] | null>(
          `${channelId}:last-whisper-targets`,
          null,
        ),
        filterAtom: atomWithStorage<ChannelFilter>(`${channelId}:filter`, 'ALL'),
        showArchivedAtom: atomWithStorage(`${channelId}:show-archived`, false),
        subPaneStateAtom: atom<SubPaneState>('NONE'),
        scrollToMessageAtom: atom<ScrollToMessageRequest | null>(null),
        highlightMessageAtom: atom<string | null>(null),
        defaultDiceFaceRef,
      };
    }, [channelId, composeAtom]);
  const inGameAtom = useMemo(
    () =>
      atom((read) => {
        const parsed = read(atoms.parsedAtom);
        if (parsed.characterName) return true;
        if (parsed.inGame == null) {
          return defaultInGame;
        }
        return parsed.inGame;
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
