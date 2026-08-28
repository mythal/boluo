import type { ApiError, MediaInfo } from '@boluo/api';
import { get } from '@boluo/api-browser';
import { unwrap } from '@boluo/utils/result';
import useSWR, { type SWRResponse } from 'swr';

export const useQueryMediaInfo = (
  mediaId: string | undefined,
): SWRResponse<MediaInfo, ApiError> => {
  const key = mediaId ? (['/media/info', mediaId] as const) : null;
  return useSWR<MediaInfo, ApiError, typeof key>(key, ([, currentMediaId]) =>
    get('/media/info', { id: currentMediaId }).then(unwrap),
  );
};
