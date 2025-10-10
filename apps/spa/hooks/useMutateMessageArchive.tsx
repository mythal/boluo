import useSWRMutation, { type MutationFetcher, type SWRMutationConfiguration } from 'swr/mutation';
import { post } from '@boluo/api-browser';
import { type ApiError, type Message } from '@boluo/api';
import { identity } from '@boluo/utils/function';

const path = '/messages/query';
type Key = readonly [typeof path, string];

const updater: MutationFetcher<Message | null, Key> = async ([_, messageId]) => {
  const result = await post('/messages/toggle_fold', { id: messageId }, {});
  if (result.isErr && result.err.code === 'NOT_FOUND') {
    return null;
  }
  return result.unwrap();
};

export const useMutateMessageArchive = (
  messageId: string,
  options: SWRMutationConfiguration<Message | null, ApiError, Key, never> = {
    revalidate: false,
    populateCache: identity,
  },
) => useSWRMutation<Message | null, ApiError, Key>([path, messageId] as const, updater, options);
