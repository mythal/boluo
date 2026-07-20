import useSWRMutation, { type MutationFetcher, type SWRMutationConfiguration } from 'swr/mutation';
import { post } from '@boluo/api-browser';
import { type ApiError, type Message } from '@boluo/api';
import { identity } from '@boluo/utils/function';

const path = '/messages/query';
type Key = readonly [typeof path, string, string | undefined];

const updater: MutationFetcher<Message | null, Key> = async ([, messageId, spaceId]) => {
  const result = await post('/messages/toggle_fold', { id: messageId, spaceId }, {});
  if (result.isErr && result.err.code === 'NOT_FOUND') {
    return null;
  }
  return result.unwrap();
};

export const useMutateMessageArchive = (
  messageId: string,
  spaceId: string | undefined,
  options: SWRMutationConfiguration<Message | null, ApiError, Key, never> = {
    revalidate: false,
    populateCache: identity,
  },
) =>
  useSWRMutation<Message | null, ApiError, Key>(
    [path, messageId, spaceId] as const,
    updater,
    options,
  );
