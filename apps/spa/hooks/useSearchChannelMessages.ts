import type { ApiError, SearchDirection, SearchMessagesResult } from '@boluo/api';
import { get } from '@boluo/api-browser';
import useSWRInfinite, { SWRInfiniteFetcher, type SWRInfiniteResponse } from 'swr/infinite';
import { unwrap } from '@boluo/utils/result';

const path = '/messages/search' as const;

export const useSearchChannelMessages = (
  channelId: string,
  keyword: string,
  direction: SearchDirection,
): SWRInfiniteResponse<SearchMessagesResult, ApiError> => {
  const trimmedKeyword = keyword.trim();

  const getKey = (
    pageIndex: number,
    previousPageData: SearchMessagesResult | null,
  ): [typeof path, string, string, SearchDirection, number | null] | null => {
    if (trimmedKeyword === '') {
      return null;
    }
    if (pageIndex > 0 && previousPageData?.nextPos == null) {
      return null;
    }
    const pos = pageIndex === 0 ? null : (previousPageData?.nextPos ?? null);
    return [path, channelId, trimmedKeyword, direction, pos] as const;
  };

  const fetcher: SWRInfiniteFetcher<SearchMessagesResult, typeof getKey> = ([
    path,
    channel,
    searchKeyword,
    searchDirection,
    pos,
  ]) =>
    get(path, {
      channelId: channel,
      keyword: searchKeyword,
      direction: searchDirection,
      pos,
    }).then(unwrap);

  return useSWRInfinite<SearchMessagesResult, ApiError>(getKey, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });
};
