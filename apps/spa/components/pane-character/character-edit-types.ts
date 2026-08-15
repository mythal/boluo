import type { EditCharacter } from '@boluo/api';

export type CharacterEditDraft = Omit<EditCharacter, 'spaceId' | 'characterId' | 'tags'>;

export interface CharacterEditAliasValue {
  value: string;
  originalValue: string | null;
}

export type CharacterEditValues = Omit<
  CharacterEditDraft,
  'expectedVersion' | 'expectedScopeVersion' | 'aliases'
> & {
  aliases: CharacterEditAliasValue[];
};
