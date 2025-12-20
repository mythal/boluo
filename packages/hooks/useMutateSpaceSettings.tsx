import useSWRMutation, { type MutationFetcher } from 'swr/mutation';
import { type SpaceSettings, spaceSettingsSchema } from './useQuerySpaceSettings';
import { post } from '@boluo/api-browser';

const path = '/spaces/settings';
type Key = readonly [typeof path, string];

const updater: MutationFetcher<SpaceSettings, Key, SpaceSettings> = async (
  [_, spaceId],
  { arg: settings },
) => {
  const result = await post('/spaces/update_settings', { id: spaceId }, settings);
  return spaceSettingsSchema.parse(result.unwrap());
};

export const useMutateSpaceSettings = (spaceId: string) =>
  useSWRMutation([path, spaceId] as const, updater, {
    revalidate: false,
    populateCache: (settings) => settings,
  });
