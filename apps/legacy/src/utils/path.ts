import { encodeUuid, type Id } from './id';

export function chatPath(spaceId: Id, channelId?: Id): string {
  if (channelId) {
    return `/chat/${encodeUuid(spaceId)}/${encodeUuid(channelId)}`;
  } else {
    return `/chat/${encodeUuid(spaceId)}`;
  }
}
