import { atom } from 'jotai';
import { atomFamily } from 'jotai-family';
import { atomWithStorage } from 'jotai/utils';
import type { SyncStorage } from 'jotai/vanilla/utils/atomWithStorage';

const RECENT_CHARACTER_STORAGE_PREFIX = 'boluo:recent-characters';
const MAX_STORED_RECENT_CHARACTERS = 50;

const getSessionStorage = (): Storage | undefined => {
  try {
    return typeof window === 'undefined' ? undefined : window.sessionStorage;
  } catch {
    return undefined;
  }
};

const storageKey = (spaceId: string, userId: string): string =>
  `${RECENT_CHARACTER_STORAGE_PREFIX}:${userId}:${spaceId}`;

export const normalizeRecentCharacterIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(value.filter((id): id is string => typeof id === 'string' && id !== '')),
  ].slice(0, MAX_STORED_RECENT_CHARACTERS);
};

export const recordRecentCharacterId = (
  recentIds: readonly string[],
  characterId: string,
): string[] => {
  return [characterId, ...recentIds.filter((id) => id !== characterId)].slice(
    0,
    MAX_STORED_RECENT_CHARACTERS,
  );
};

const recentCharacterStorage: SyncStorage<string[]> = {
  getItem: (key, initialValue) => {
    const storage = getSessionStorage();
    if (storage == null) return initialValue;
    try {
      return normalizeRecentCharacterIds(JSON.parse(storage.getItem(key) ?? '[]'));
    } catch {
      return initialValue;
    }
  },
  setItem: (key, value) => {
    try {
      getSessionStorage()?.setItem(key, JSON.stringify(value));
    } catch {
      // Keep the atom useful even when session storage is unavailable.
    }
  },
  removeItem: (key) => {
    try {
      getSessionStorage()?.removeItem(key);
    } catch {
      // Nothing else needs to be cleared when session storage is unavailable.
    }
  },
};

interface RecentCharacterAtomKey {
  spaceId: string;
  userId: string;
}

const recentCharacterAtomKeyEqual = (
  left: RecentCharacterAtomKey,
  right: RecentCharacterAtomKey,
): boolean => left.spaceId === right.spaceId && left.userId === right.userId;

export const recentCharacterIdsAtomFamily = atomFamily(
  ({ spaceId, userId }: RecentCharacterAtomKey) => {
    const storedAtom = atomWithStorage<string[]>(
      storageKey(spaceId, userId),
      [],
      recentCharacterStorage,
    );
    return atom(
      (get) => get(storedAtom),
      (get, set, characterId: string) => {
        set(storedAtom, recordRecentCharacterId(get(storedAtom), characterId));
      },
    );
  },
  recentCharacterAtomKeyEqual,
);

export const selectRecentCharacters = <T extends { id: string; ownerId: string | null }>(
  characters: readonly T[],
  userId: string,
  recentIds: readonly string[],
  limit: number,
): T[] => {
  const charactersById = new Map(characters.map((character) => [character.id, character]));
  const selected: T[] = [];
  const selectedIds = new Set<string>();

  for (const id of recentIds) {
    const character = charactersById.get(id);
    if (character == null || selectedIds.has(id)) continue;
    selected.push(character);
    selectedIds.add(id);
  }

  for (const character of characters) {
    if (character.ownerId !== userId || selectedIds.has(character.id)) continue;
    selected.push(character);
    selectedIds.add(character.id);
  }

  if (selected.length === 0) return characters.slice(0, limit);
  return selected.slice(0, limit);
};
