import type { Channel, MemberWithUser, Space, UserStatus } from '@boluo/api';
import type { ClientWebSocketCloseReason } from '@boluo/api/websocket/close';

export type ChatEffect =
  | {
      type: 'CLOSE_CONNECTION';
      id: string;
      connection: WebSocket;
      reason: Exclude<ClientWebSocketCloseReason, 'UNKNOWN'>;
    }
  | {
      type: 'CHANNEL_CHANGED';
      id: string;
      spaceId: string;
      channelId: string;
      channel: Channel | null;
      dedupeKey: string;
    }
  | {
      type: 'CHANNEL_INVALIDATED';
      id: string;
      spaceId: string;
      channelId: string;
      dedupeKey: string;
    }
  | {
      type: 'MEMBERS_UPDATED';
      id: string;
      channelId: string;
      members: MemberWithUser[];
      dedupeKey: string;
    }
  | { type: 'SPACE_CHANGED'; id: string; spaceId: string; space: Space; dedupeKey: string }
  | { type: 'SPACE_INVALIDATED'; id: string; spaceId: string; dedupeKey: string }
  | {
      type: 'STATUS_UPDATED';
      id: string;
      spaceId: string;
      statusMap: Record<string, UserStatus | undefined>;
      dedupeKey: string;
    }
  | {
      type: 'CHARACTER_CHANGED';
      id: string;
      spaceId: string;
      characterId: string;
      dedupeKey: string;
    }
  | {
      type: 'ENTRY_CHANGED';
      id: string;
      spaceId: string;
      scopeId: string;
      entryId: string;
      dedupeKey: string;
    };
