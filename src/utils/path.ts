import { encodeUuid, Id } from './id';

export function channelChatPath(spaceId: Id, channelId: Id): string {
  return `/chat/${encodeUuid(spaceId)}/${encodeUuid(channelId)}`;
}
