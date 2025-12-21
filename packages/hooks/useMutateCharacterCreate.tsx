import useSWRMutation, { type MutationFetcher, type SWRMutationConfiguration } from 'swr/mutation';
import { post } from '@boluo/api-browser';
import type { ApiError, Character, CreateCharacter } from '@boluo/api';

const path = '/characters/by_space';
type Key = readonly [typeof path, string, boolean];
type Args = Omit<CreateCharacter, 'spaceId'>;

const updater: MutationFetcher<Character, Key, Args> = async ([, spaceId], { arg }) => {
  const result = await post('/characters/create', null, { ...arg, spaceId });
  return result.unwrap();
};

export const useMutateCharacterCreate = (
  spaceId: string,
  includeArchived = false,
  options: SWRMutationConfiguration<Character, ApiError, Key, Args> = {
    revalidate: true,
  },
) =>
  useSWRMutation<Character, ApiError, Key, Args>(
    [path, spaceId, includeArchived] as const,
    updater,
    options,
  );
