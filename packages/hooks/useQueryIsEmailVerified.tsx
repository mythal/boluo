import type { ApiError } from '@boluo/api';
import { get } from '@boluo/api-browser';
import useSWR, { type SWRConfiguration, type SWRResponse } from 'swr';

export const useQueryIsEmailVerified = (
  config?: SWRConfiguration<boolean, ApiError>,
): SWRResponse<boolean, ApiError> => {
  return useSWR(
    ['/users/email_verification_status' as const, null],
    async ([path]): Promise<boolean> => {
      const result = await get(path, null);
      return result.unwrapOr({ isVerified: false }).isVerified;
    },
    config,
  );
};
