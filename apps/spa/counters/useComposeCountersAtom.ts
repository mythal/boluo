import { useAtomValue, useStore, atom, type Atom } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { useLayoutEffect, useMemo } from 'react';
import { parseModifiers, needsVariableEnvironment } from '@boluo/interpreter';
import { useQueryEntries } from '@boluo/hooks/useQueryEntries';
import { useQueryEntriesByComponent } from '@boluo/hooks/useQueryEntriesByComponent';
import { useMember } from '../hooks/useMember';
import { useDefaultInGame } from '../hooks/useDefaultInGame';
import { resolveSpeakerMode, type SpeakerAttribution } from '../characters/resolveSpeaker';
import { usePortrayableCharacters } from '../hooks/usePortrayableCharacters';
import type { ComposeState } from '../state/compose.reducer';
import { mergeCounterEntries } from './operations';

import type { Character } from '@boluo/api';
import type { AsTarget } from '@boluo/interpreter';
import { createCharacterDirectory, resolveCharacterIdentifier } from '../characters/directory';
import type { ComposeCountersState } from './types';

// An explicit .as @ selects the channel character even when editing another character's message.
export const resolveCounterTarget = ({
  target,
  channelCharacterId,
  originalMessageAttribution,
  defaultInGame,
  parsedInGame,
  characters,
}: {
  target: AsTarget | null;
  channelCharacterId: string | null;
  originalMessageAttribution?: Pick<SpeakerAttribution, 'characterId' | 'inGame'>;
  defaultInGame: boolean;
  parsedInGame: boolean | null;
  characters: readonly Character[];
}): { hasTarget: boolean; character: Character | undefined } => {
  if (target?.type === 'TemporaryName') return { hasTarget: false, character: undefined };
  if (target?.type === 'CharacterReference') {
    return {
      hasTarget: true,
      character:
        resolveCharacterIdentifier(target.identifier, createCharacterDirectory(characters)) ??
        undefined,
    };
  }
  const { usesOriginalMessageAttribution } = resolveSpeakerMode({
    defaultInGame,
    parsedInGame,
    asTarget: target,
    originalMessageAttribution,
  });
  const id = usesOriginalMessageAttribution
    ? originalMessageAttribution?.characterId
    : channelCharacterId;
  return {
    hasTarget: id != null,
    character: characters.find((character) => character.id === id && character.archivedAt == null),
  };
};

export const useComposeCountersAtom = (
  composeAtom: Atom<ComposeState>,
): Atom<ComposeCountersState> => {
  const member = useMember();
  const defaultInGame = useDefaultInGame();
  const { characters, error: characterError } = usePortrayableCharacters(member?.space.spaceId);
  const source = useAtomValue(
    useMemo(() => selectAtom(composeAtom, (state) => state.source), [composeAtom]),
  );
  const originalMessageAttribution = useAtomValue(
    useMemo(
      () => selectAtom(composeAtom, (state) => state.originalMessageAttribution),
      [composeAtom],
    ),
  );
  const needsCounters = useMemo(() => needsVariableEnvironment(source), [source]);
  const modifiers = parseModifiers(source);
  const { hasTarget, character } = resolveCounterTarget({
    target: modifiers.asTarget,
    channelCharacterId: member?.channel.characterId ?? null,
    originalMessageAttribution,
    defaultInGame,
    parsedInGame: modifiers.inGame ? modifiers.inGame.inGame : null,
    characters: characters ?? [],
  });
  const { data: counters, error } = useQueryEntriesByComponent(
    member?.space.spaceId,
    needsCounters ? character?.scopeId : undefined,
    'core/counter',
  );
  const { data: scopeEntries, error: scopeError } = useQueryEntries(
    member?.space.spaceId,
    needsCounters ? character?.scopeId : undefined,
  );
  const entries = useMemo(
    () => (scopeEntries && counters ? mergeCounterEntries(scopeEntries, counters) : undefined),
    [scopeEntries, counters],
  );
  const loadState = useMemo((): ComposeCountersState => {
    if (!needsCounters) return { type: 'Idle', source };
    if (!hasTarget) return { type: 'Unavailable', source };
    if (characterError || error || scopeError) return { type: 'Error', source };
    if (characters == null) return { type: 'Loading', source };
    if (!character) return { type: 'Unavailable', source };
    if (entries == null) return { type: 'Loading', source };
    return { type: 'Ready', source, scopeId: character.scopeId, entries };
  }, [
    source,
    needsCounters,
    hasTarget,
    characterError,
    error,
    scopeError,
    characters,
    character,
    entries,
  ]);
  const countersAtom = useMemo(() => atom<ComposeCountersState>({ type: 'Idle', source: '' }), []);
  const store = useStore();
  useLayoutEffect(() => {
    store.set(countersAtom, loadState);
  }, [store, countersAtom, loadState]);
  return countersAtom;
};
