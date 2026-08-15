import type { Character } from '@boluo/api';
import { post, put } from '@boluo/api-browser';
import { unwrap } from '@boluo/utils/result';
import { useCallback } from 'react';
import { useSWRConfig } from 'swr';
import type { CharacterEditDraft } from './CharacterEditForm';

const mutationError = (cause: unknown): Error => {
  if (cause instanceof Error) return cause;
  if (typeof cause === 'object' && cause != null) {
    if ('message' in cause && typeof cause.message === 'string') return new Error(cause.message);
    if ('code' in cause) return new Error(String(cause.code));
  }
  return new Error('Failed to update character');
};

export const useCharacterMutations = (character: Character | undefined) => {
  const { mutate } = useSWRConfig();
  const updateCaches = useCallback(
    async (updatedCharacter: Character) => {
      if (character == null) throw new Error('Character is not loaded');
      await mutate(['/characters/query', character.spaceId, character.id], updatedCharacter, false);
      await Promise.all([
        mutate(['/characters/by_space', character.spaceId, false, false]),
        mutate(['/characters/by_space', character.spaceId, false, true]),
        mutate(['/characters/by_space', character.spaceId, true, false]),
        mutate(['/characters/by_space', character.spaceId, true, true]),
        mutate(['/characters/usages', character.spaceId, character.id]),
      ]);
    },
    [character, mutate],
  );

  const editCharacter = useCallback(
    async (draft: CharacterEditDraft) => {
      if (character == null) throw new Error('Character is not loaded');
      try {
        const updated = await put('/characters/edit', null, {
          spaceId: character.spaceId,
          characterId: character.id,
          expectedVersion: draft.expectedVersion,
          expectedScopeVersion: draft.expectedScopeVersion,
          name: draft.name,
          key: draft.key,
          aliases: draft.aliases,
          description: draft.description,
          color: draft.color,
          accessPolicy: draft.accessPolicy,
          accessChannelId: draft.accessChannelId,
          tags: character.tags,
        }).then(unwrap);
        await updateCaches(updated).catch(() => undefined);
      } catch (cause) {
        throw mutationError(cause);
      }
    },
    [character, updateCaches],
  );

  const setArchived = useCallback(
    async (archived: boolean) => {
      if (character == null) throw new Error('Character is not loaded');
      try {
        const updated = await post(archived ? '/characters/archive' : '/characters/restore', null, {
          spaceId: character.spaceId,
          characterId: character.id,
          expectedVersion: character.version,
        }).then(unwrap);
        await updateCaches(updated).catch(() => undefined);
      } catch (cause) {
        throw mutationError(cause);
      }
    },
    [character, updateCaches],
  );

  return { editCharacter, setArchived };
};
