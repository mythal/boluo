export interface CharacterPortraitSelection {
  characterId: string;
  portraitId: string;
}

export const selectedPortraitIdForCharacter = (
  characterId: string | null,
  selection: CharacterPortraitSelection | null,
): string | null =>
  characterId != null && selection?.characterId === characterId ? selection.portraitId : null;

export const shouldClearCharacterPortraitSelection = (
  characterId: string | null,
  selection: CharacterPortraitSelection | null,
  availablePortraitIds: readonly string[],
): boolean =>
  selection?.characterId === characterId && !availablePortraitIds.includes(selection.portraitId);
