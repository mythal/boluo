import useSWRMutation, { type MutationFetcher, type SWRMutationConfiguration } from 'swr/mutation';
import { post } from '@boluo/api-browser';
import type { ApiError, Character, EditCharacter } from '@boluo/api';
import { identity } from '@boluo/utils/function';

const path = '/characters/query';
type Key = readonly [typeof path, string];
type Args = Omit<EditCharacter, 'characterId'>;

const updater: MutationFetcher<Character, Key, Args> = async ([, characterId], { arg }) => {
  const result = await post('/characters/edit', null, { ...arg, characterId });
  return result.unwrap();
};

export const useMutateCharacterEdit = (
  characterId: string,
  options: SWRMutationConfiguration<Character, ApiError, Key, Args> = {
    revalidate: false,
    populateCache: identity,
  },
) =>
  useSWRMutation<Character, ApiError, Key, Args>(
    [path, characterId] as const,
    updater,
    options,
  );
