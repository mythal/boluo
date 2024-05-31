import type { ApiError } from '@boluo/api';
import { get } from '@boluo/api-browser';
import useSWR, { type SWRResponse } from 'swr';
import { type ZodError, z } from 'zod';

export const spaceSettingsSchema = z.object({
  channelsOrder: z.array(z.string()).optional(),
});

export type SpaceSettings = z.infer<typeof spaceSettingsSchema>;

type Error = ApiError | ZodError;

export const useQuerySpaceSettings = (spaceId: string): SWRResponse<SpaceSettings, Error> => {
  const key = ['/spaces/settings', spaceId] as const;
  return useSWR<SpaceSettings, Error, typeof key>(
    key,
    async ([path, id]) => {
      const result = await get(path, { id });
      const raw = result.unwrap();
      return spaceSettingsSchema.parse(raw);
    },
    { fallbackData: {} },
  );
};
