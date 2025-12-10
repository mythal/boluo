import type {
  ApiError,
  SearchDirection,
  SearchFilter,
  SearchMessagesResult,
  SearchNameFilter,
} from '@boluo/api';
import { get } from '@boluo/api-browser';
import useSWRInfinite, { type SWRInfiniteFetcher, type SWRInfiniteResponse } from 'swr/infinite';
import { unwrap } from '@boluo/utils/result';

const path = '/messages/search' as const;

export interface SearchOptions {
  direction: SearchDirection;
  includeArchived: boolean;
  filter: SearchFilter;
  nameFilter: SearchNameFilter;
}

export const useSearchChannelMessages = (
  channelId: string,
  keyword: string,
  searchOptions: SearchOptions,
): SWRInfiniteResponse<SearchMessagesResult, ApiError> => {
  const trimmedKeyword = keyword.trim();

  const getKey = (
    pageIndex: number,
    previousPageData: SearchMessagesResult | null,
  ): [typeof path, string, string, SearchOptions, number | null] | null => {
    if (trimmedKeyword === '') {
      return null;
    }
    if (pageIndex > 0 && previousPageData?.nextPos == null) {
      return null;
    }
    const pos = pageIndex === 0 ? null : (previousPageData?.nextPos ?? null);
    return [path, channelId, trimmedKeyword, searchOptions, pos] as const;
  };

  const fetcher: SWRInfiniteFetcher<SearchMessagesResult, typeof getKey> = ([
    path,
    channel,
    searchKeyword,
    searchOptions,
    pos,
  ]) =>
    get(path, {
      channelId: channel,
      keyword: searchKeyword,
      direction: searchOptions.direction,
      includeArchived: searchOptions.includeArchived,
      filter: searchOptions.filter,
      nameFilter: searchOptions.nameFilter,
      pos,
    }).then(unwrap);

  return useSWRInfinite<SearchMessagesResult, ApiError>(getKey, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });
};
