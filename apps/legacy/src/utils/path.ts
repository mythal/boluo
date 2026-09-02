import { type Id } from './id';

export function chatPath(spaceId: Id, channelId?: Id): string {
  if (channelId) {
    return `/chat/${spaceId}/${channelId}`;
  } else {
    return `/chat/${spaceId}`;
  }
}
