import useSWRMutation, { type MutationFetcher, type SWRMutationConfiguration } from 'swr/mutation';
import { post } from '@boluo/api-browser';
import type { ApiError, CharacterVariable, EditVariable } from '@boluo/api';

const path = '/characters/variables';
type Key = readonly [typeof path, string];
type Args = Omit<EditVariable, 'characterId'>;

const updater: MutationFetcher<CharacterVariable, Key, Args> = async ([, characterId], { arg }) => {
  const result = await post('/characters/edit_variable', null, { ...arg, characterId });
  return result.unwrap();
};

export const useMutateCharacterVariableEdit = (
  characterId: string,
  options: SWRMutationConfiguration<CharacterVariable, ApiError, Key, Args> = {
    revalidate: true,
  },
) =>
  useSWRMutation<CharacterVariable, ApiError, Key, Args>(
    [path, characterId] as const,
    updater,
    options,
  );
