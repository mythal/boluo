import type { Character } from '@boluo/api';
import { post, put } from '@boluo/api-browser';
import { unwrap } from '@boluo/utils/result';
import { useCallback } from 'react';
import { useIntl } from 'react-intl';
import { useSWRConfig } from 'swr';
import type { CharacterEditDraft } from './character-edit-types';
import { CharacterStaleError, toCharacterMutationError } from './character-errors';

export const useCharacterMutations = (character: Character | undefined) => {
  const intl = useIntl();
  const { mutate } = useSWRConfig();
  const refreshCharacter = useCallback(async () => {
    if (character == null) return;
    await mutate(['/characters/query', character.spaceId, character.id]);
  }, [character, mutate]);
  const rethrowMutationError = useCallback(
    async (cause: unknown): Promise<never> => {
      const error = toCharacterMutationError(intl, cause);
      if (error instanceof CharacterStaleError) {
        await refreshCharacter().catch(() => undefined);
      }
      throw error;
    },
    [intl, refreshCharacter],
  );
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
        await rethrowMutationError(cause);
      }
    },
    [character, rethrowMutationError, updateCaches],
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
        await rethrowMutationError(cause);
      }
    },
    [character, rethrowMutationError, updateCaches],
  );

  return { editCharacter, setArchived };
};
