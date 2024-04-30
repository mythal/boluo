import { atomFamily, atomWithStorage } from 'jotai/utils';

export const channelReadFamily = atomFamily((channelId: string) =>
  atomWithStorage(`channel:${channelId}:read`, Number.MIN_VALUE),
);
