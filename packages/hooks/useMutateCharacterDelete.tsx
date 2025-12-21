import useSWRMutation, { type MutationFetcher, type SWRMutationConfiguration } from 'swr/mutation';
import { post } from '@boluo/api-browser';
import type { ApiError } from '@boluo/api';

const path = '/characters/query';
type Key = readonly [typeof path, string];

const updater: MutationFetcher<boolean, Key> = async ([, characterId]) => {
  const result = await post('/characters/delete', { id: characterId }, {});
  return result.unwrap();
};

export const useMutateCharacterDelete = (
  characterId: string,
  options: SWRMutationConfiguration<boolean, ApiError, Key, never> = {
    revalidate: false,
  },
) => useSWRMutation<boolean, ApiError, Key>([path, characterId] as const, updater, options);
