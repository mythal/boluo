import type { Character } from '@boluo/api';

export interface CharacterDirectory {
  byIdentifier: ReadonlyMap<string, Character>;
  bySuggestionText: ReadonlyMap<string, readonly Character[]>;
}

export const normalizeCharacterIdentifier = (value: string): string =>
  value.trim().normalize('NFC').toLowerCase();

export const getShortestCharacterIdentifier = (
  character: Pick<Character, 'key' | 'aliases'>,
): string => {
  let shortest = character.key;
  let shortestLength = shortest.length;
  for (const alias of character.aliases) {
    const length = alias.length;
    if (length < shortestLength) {
      shortest = alias;
      shortestLength = length;
    }
  }
  return shortest;
};

export const createCharacterDirectory = (characters: readonly Character[]): CharacterDirectory => {
  const byIdentifier = new Map<string, Character>();
  const bySuggestionText = new Map<string, Character[]>();
  for (const character of characters) {
    if (character.archivedAt != null) continue;
    byIdentifier.set(normalizeCharacterIdentifier(character.key), character);
    for (const alias of character.aliases) {
      byIdentifier.set(normalizeCharacterIdentifier(alias), character);
    }
    for (const text of [character.name, character.key, ...character.aliases]) {
      const normalized = normalizeCharacterIdentifier(text);
      const matches = bySuggestionText.get(normalized);
      if (matches == null) {
        bySuggestionText.set(normalized, [character]);
      } else if (!matches.includes(character)) {
        matches.push(character);
      }
    }
  }
  return { byIdentifier, bySuggestionText };
};

export const resolveCharacterIdentifier = (
  identifier: string,
  directory: CharacterDirectory,
): Character | null => directory.byIdentifier.get(normalizeCharacterIdentifier(identifier)) ?? null;

export const suggestCharacters = (
  name: string,
  directory: CharacterDirectory,
): readonly Character[] => directory.bySuggestionText.get(normalizeCharacterIdentifier(name)) ?? [];
