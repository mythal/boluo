import { type ApiError } from '@boluo/api';
import { get } from '@boluo/api-browser';
import useSWRMutation, { type MutationFetcher, type SWRMutationConfiguration } from 'swr/mutation';

const path = '/users/verify_email';
type Key = readonly [typeof path, string];

const updater: MutationFetcher<boolean, Key> = async ([, token]) => {
  const result = await get(path, { token });
  return result.unwrap();
};

export const useMutateVerifyEmail = (
  token: string,
  options?: SWRMutationConfiguration<boolean, ApiError, Key, never>,
) => useSWRMutation<boolean, ApiError, Key>([path, token] as const, updater, options);
