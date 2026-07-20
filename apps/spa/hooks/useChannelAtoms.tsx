import { type Atom, atom, type PrimitiveAtom, type WritableAtom } from 'jotai';
import { atomWithStorage, selectAtom, unwrap } from 'jotai/utils';
import { createContext, use, useLayoutEffect, useMemo, useRef } from 'react';
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

export type ComposeParseResult = ParseResult & {
  source: string;
};

export interface ChannelAtoms {
  composeAtom: WritableAtom<ComposeState, [ComposeActionUnion], void>;
  checkComposeAtom: Atom<ComposeError | null>;
  parsedAtom: Atom<ComposeParseResult>;
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
  useLayoutEffect(() => {
    defaultDiceFaceRef.current = defaultDiceFace;
  }, [defaultDiceFace]);
  const composeAtom = composeAtomFamily({ channelId, paneKey });
  const checkComposeAtom: Atom<ComposeError | null> = useMemo(
    () => selectAtom(composeAtom, checkCompose(characterName, defaultInGame)),
    [characterName, composeAtom, defaultInGame],
  );
  const atoms: Omit<
    ChannelAtoms,
    'composeAtom' | 'checkComposeAtom' | 'inGameAtom' | 'defaultDiceFaceRef'
  > = useMemo(() => {
    const sourceAtom = atom((get) => get(composeAtom).source);
    const initialParseResult: ComposeParseResult = {
      ...composeInitialParseResult,
      source: '',
    };
    const cachedParseResultRef = { current: initialParseResult };
    // The atom read functions below run in the jotai store, not during
    // render, so capturing and mutating the refs there is safe.
    /* eslint-disable react-hooks/refs */
    const unwrappedParsedAtom = unwrap(
      atom(async (get, { signal }): Promise<ComposeParseResult> => {
        const source = get(sourceAtom);
        const result = await asyncParse(
          { source, defaultDiceFace: defaultDiceFaceRef.current },
          signal,
        );
        return { ...result, source };
      }),
      (previous) => previous ?? initialParseResult,
    );
    const parsedAtom = atom((get) => {
      try {
        cachedParseResultRef.current = get(unwrappedParsedAtom);
      } catch {
        // Keep the last successful parse result if parsing fails.
      }
      return cachedParseResultRef.current;
    });
    /* eslint-enable react-hooks/refs */
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
  return { ...atoms, checkComposeAtom, composeAtom, inGameAtom, defaultDiceFaceRef };
};

export const useChannelAtoms = (): ChannelAtoms => {
  const atoms = use(ChannelAtomsContext);
  if (atoms == null) {
    throw new Error('Access channel atoms outside context');
  }
  return atoms;
};
