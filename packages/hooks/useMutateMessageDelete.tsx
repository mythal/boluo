import useSWRMutation, { type MutationFetcher, type SWRMutationConfiguration } from 'swr/mutation';
import { post } from '@boluo/api-browser';
import { type ApiError } from '@boluo/api';

const path = '/messages/query';
type Key = readonly [typeof path, string, string | undefined];

const updater: MutationFetcher<string, Key> = async ([, messageId, spaceId]) => {
  const result = await post('/messages/delete', { id: messageId, spaceId }, {});
  if (result.isErr && result.err.code === 'NOT_FOUND') {
    return messageId;
  }
  result.unwrap();
  return messageId;
};

export const useMutateMessageDelete = (
  messageId: string,
  spaceId: string | undefined,
  options: SWRMutationConfiguration<string, ApiError, Key, never> = { revalidate: false },
) => useSWRMutation<string, ApiError, Key>([path, messageId, spaceId] as const, updater, options);
