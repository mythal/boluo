import useSWRMutation, { type MutationFetcher, type SWRMutationConfiguration } from 'swr/mutation';
import { post } from '@boluo/api-browser';
import { type ApiError } from '@boluo/api';

const path = '/messages/query';
type Key = readonly [typeof path, string];

const updater: MutationFetcher<string, Key> = async ([_, messageId]) => {
  const result = await post('/messages/delete', { id: messageId }, {});
  if (result.isErr && result.err.code === 'NOT_FOUND') {
    return messageId;
  }
  result.unwrap();
  return messageId;
};

export const useMutateMessageDelete = (
  messageId: string,
  options: SWRMutationConfiguration<string, ApiError, Key, never> = { revalidate: false },
) => useSWRMutation<string, ApiError, Key>([path, messageId] as const, updater, options);
