import { atomFamily } from 'jotai-family';
import { atomWithStorage } from 'jotai/utils';

export const channelReadFamily = atomFamily((channelId: string) =>
  atomWithStorage(`channel:${channelId}:read`, Number.MIN_VALUE),
);
