import { useQueryCharacters } from '@boluo/hooks/useQueryCharacters';
import { useCallback, useMemo } from 'react';
import {
  createCharacterDirectory,
  resolveCharacterIdentifier,
  suggestCharacters,
} from '../characters/directory';
import type { ApiError, Character } from '@boluo/api';
import type { CharacterResolution } from '../characters/resolveSpeaker';

export interface PortrayableCharacters {
  characters: Character[] | undefined;
  activeCharacters: Character[] | undefined;
  isLoading: boolean;
  error: ApiError | undefined;
  resolve: (identifier: string) => CharacterResolution;
  suggest: (name: string) => readonly Character[];
}

export const usePortrayableCharacters = (spaceId: string | undefined): PortrayableCharacters => {
  const query = useQueryCharacters({
    spaceId,
    includeArchived: true,
    portrayableOnly: true,
  });
  const activeCharacters = useMemo(
    () => query.data?.filter((character) => character.archivedAt == null),
    [query.data],
  );
  const directory = useMemo(
    () => (query.data == null ? undefined : createCharacterDirectory(query.data)),
    [query.data],
  );
  const resolve = useCallback(
    (identifier: string): CharacterResolution => {
      if (directory == null) {
        return query.error == null ? { status: 'Loading' } : { status: 'Error' };
      }
      const character = resolveCharacterIdentifier(identifier, directory);
      return character == null ? { status: 'NotFound' } : { status: 'Found', character };
    },
    [directory, query.error],
  );
  const suggest = useCallback(
    (name: string) => (directory == null ? [] : suggestCharacters(name, directory)),
    [directory],
  );
  return {
    characters: query.data,
    activeCharacters,
    isLoading: query.isLoading,
    error: query.error,
    resolve,
    suggest,
  };
};
