import type { ApiError } from '@boluo/api';
import { get } from '@boluo/api-browser';
import useSWR, { type SWRResponse } from 'swr';
import * as z from 'zod/mini';
import en from 'zod/v4/locales/en.js';

z.config(en());

export const spaceSettingsSchema = z.object({
  channelsOrder: z.optional(z.array(z.string())),
});

export type SpaceSettings = z.infer<typeof spaceSettingsSchema>;

type Error = ApiError | z.core.$ZodError;

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
