import useSWRMutation, { MutationFetcher, SWRMutationConfiguration } from 'swr/mutation';
import { post } from '@boluo/api-browser';
import { ApiError, Message } from '@boluo/api';

const path = '/messages/query';
type Key = readonly [typeof path, string];

const updater: MutationFetcher<Message, Key> = async ([_, messageId]) => {
  const result = await post('/messages/delete', { id: messageId }, {});
  return result.unwrap();
};

export const useMutateMessageDelete = (
  messageId: string,
  options: SWRMutationConfiguration<Message, ApiError, Key, never> = { revalidate: false },
) => useSWRMutation<Message, ApiError, Key>([path, messageId] as const, updater, options);
