import { createComposeIssuesAtom, type ComposeIssue } from '../state/compose-issues';
import { useMember } from './useMember';
import { usePortrayableCharacters } from './usePortrayableCharacters';
import { type Atom, atom, type PrimitiveAtom, type WritableAtom } from 'jotai';
import { atomWithStorage, selectAtom, unwrap } from 'jotai/utils';
import { createContext, use, useLayoutEffect, useMemo, useRef } from 'react';
import { asyncParse } from '../interpreter/async-parse';
import {
  composeInitialParseResult,
  parseModifiers,
  needsVariableEnvironment,
  type AsTarget,
  type ParseResult,
} from '@boluo/interpreter';
import type { ComposeActionUnion } from '../state/compose.actions';
import { checkCompose, type ComposeError, type ComposeState } from '../state/compose.reducer';
import { usePaneKey } from './usePaneKey';
import { composeAtomFamily } from '../state/compose.atoms';
import { resolveSpeakerMode } from '../characters/resolveSpeaker';

import { useComposeCountersAtom } from '../counters/useComposeCountersAtom';
import { buildVariableEnv } from '../counters/operations';
import type { ComposeCountersState, CounterIssue } from '../counters/types';
import { prepareCounterPreview } from '../counters/prepare-preview';
import { counterIssue } from '../counters/feedback';

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
  countersState?: ComposeCountersState;
  counterIssue?: CounterIssue | null;
};

export interface ChannelAtoms {
  composeIssuesAtom: Atom<ComposeIssue[]>;
  sendingAtom: PrimitiveAtom<boolean>;
  counterIssueAtom: Atom<CounterIssue | null>;
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
  asTargetTextAtom: Atom<string>;
  asTargetAtom: Atom<AsTarget | null>;
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
  const countersStateAtom = useComposeCountersAtom(composeAtom, defaultInGame);
  const checkComposeAtom: Atom<ComposeError | null> = useMemo(
    () => selectAtom(composeAtom, checkCompose(characterName, defaultInGame)),
    [characterName, composeAtom, defaultInGame],
  );
  const atoms: Omit<
    ChannelAtoms,
    'composeAtom' | 'checkComposeAtom' | 'inGameAtom' | 'defaultDiceFaceRef' | 'composeIssuesAtom'
  > = useMemo(() => {
    const sourceAtom = atom((get) => get(composeAtom).source);
    const editingAtom = atom((get) => get(composeAtom).edit != null);
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
        const editing = get(editingAtom);
        const loadState = get(countersStateAtom);
        const variables = buildVariableEnv(
          loadState.source === source && loadState.type === 'Ready' ? loadState.entries : [],
        );
        const result = await asyncParse(
          { source, defaultDiceFace: defaultDiceFaceRef.current, variables },
          signal,
        );
        const prepared = prepareCounterPreview(result, {
          source,
          editing,
          loadState,
        });
        return {
          ...prepared.parsed,
          source,
          countersState: loadState,
          counterIssue: counterIssue(prepared, loadState),
        };
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
    const counterIssueAtom = atom((get): CounterIssue | null => {
      const source = get(sourceAtom);
      const parsed = get(parsedAtom);
      if (parsed.source !== source || parsed.countersState !== get(countersStateAtom)) {
        return needsVariableEnvironment(source) ? { type: 'LoadingCounters' } : null;
      }
      return parsed.counterIssue ?? null;
    });
    const asTargetAtom = selectAtom(composeAtom, ({ source }) => {
      try {
        return parseModifiers(source).asTarget;
      } catch {
        return null;
      }
    });
    const asTargetTextAtom = atom((get) => {
      const target = get(asTargetAtom);
      if (target == null) return '';
      if (target.type === 'CharacterReference') return `@${target.identifier}`;
      return target.type === 'DefaultCharacter' ? '@' : target.name;
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
      counterIssueAtom,
      sendingAtom: atom(false),
      isActionAtom,
      asTargetTextAtom,
      asTargetAtom,
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
  }, [channelId, composeAtom, countersStateAtom]);
  const originalMessageInGameAtom = useMemo(
    () =>
      selectAtom(
        composeAtom,
        ({ originalMessageAttribution }) => originalMessageAttribution?.inGame,
      ),
    [composeAtom],
  );
  const inGameAtom = useMemo(
    () =>
      atom((read) => {
        const parsed = read(atoms.parsedAtom);
        const originalMessageInGame = read(originalMessageInGameAtom);
        return resolveSpeakerMode({
          defaultInGame,
          parsedInGame: parsed.inGame,
          asTarget: parsed.asTarget,
          originalMessageAttribution:
            originalMessageInGame == null ? undefined : { inGame: originalMessageInGame },
        }).inGame;
      }),
    [atoms.parsedAtom, defaultInGame, originalMessageInGameAtom],
  );
  const member = useMember();
  const { resolve } = usePortrayableCharacters(member?.space.spaceId);
  const nickname = member?.user.nickname ?? '';
  const channelCharacterId = member?.channel.characterId ?? null;
  const composeIssuesAtom = useMemo(
    () =>
      createComposeIssuesAtom(
        {
          composeAtom,
          checkComposeAtom,
          counterIssueAtom: atoms.counterIssueAtom,
          sendingAtom: atoms.sendingAtom,
        },
        {
          nickname,
          defaultInGame,
          channelCharacterId,
          channelCharacterName: characterName,
          resolveCharacter: resolve,
        },
      ),
    [
      composeAtom,
      checkComposeAtom,
      atoms.counterIssueAtom,
      atoms.sendingAtom,
      nickname,
      defaultInGame,
      channelCharacterId,
      characterName,
      resolve,
    ],
  );
  return {
    ...atoms,
    checkComposeAtom,
    composeAtom,
    inGameAtom,
    defaultDiceFaceRef,
    composeIssuesAtom,
  };
};

export const useChannelAtoms = (): ChannelAtoms => {
  const atoms = use(ChannelAtomsContext);
  if (atoms == null) {
    throw new Error('Access channel atoms outside context');
  }
  return atoms;
};
