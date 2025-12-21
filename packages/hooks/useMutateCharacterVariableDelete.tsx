import useSWRMutation, { type MutationFetcher, type SWRMutationConfiguration } from 'swr/mutation';
import { post } from '@boluo/api-browser';
import type { ApiError, DeleteVariable } from '@boluo/api';

const path = '/characters/variables';
type Key = readonly [typeof path, string];
type Args = Omit<DeleteVariable, 'characterId'>;

const updater: MutationFetcher<boolean, Key, Args> = async ([, characterId], { arg }) => {
  const result = await post('/characters/delete_variable', null, { ...arg, characterId });
  return result.unwrap();
};

export const useMutateCharacterVariableDelete = (
  characterId: string,
  options: SWRMutationConfiguration<boolean, ApiError, Key, Args> = {
    revalidate: true,
  },
) =>
  useSWRMutation<boolean, ApiError, Key, Args>(
    [path, characterId] as const,
    updater,
    options,
  );
