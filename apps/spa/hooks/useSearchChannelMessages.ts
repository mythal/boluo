import type { ApiError, SearchDirection, SearchMessagesResult } from '@boluo/api';
import { get } from '@boluo/api-browser';
import useSWRInfinite, { type SWRInfiniteResponse } from 'swr/infinite';
import { unwrap } from '@boluo/utils/result';

export const useSearchChannelMessages = (
  channelId: string,
  keyword: string,
  direction: SearchDirection,
): SWRInfiniteResponse<SearchMessagesResult, ApiError> => {
  const trimmedKeyword = keyword.trim();

  return useSWRInfinite<SearchMessagesResult, ApiError>(
    (pageIndex, previousPageData) => {
      if (trimmedKeyword === '') {
        return null;
      }
      if (pageIndex > 0 && previousPageData?.nextPos == null) {
        return null;
      }
      const pos = pageIndex === 0 ? null : (previousPageData?.nextPos ?? null);
      return ['/channels/search_messages', channelId, trimmedKeyword, direction, pos] as const;
    },
    ([path, channel, searchKeyword, searchDirection, pos]) =>
      get(path, {
        channelId: channel,
        keyword: searchKeyword,
        direction: searchDirection,
        pos,
      }).then(unwrap),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );
};
