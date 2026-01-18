import type { Channel, MemberWithUser, Space, UserStatus } from '@boluo/api';

export type ChatEffect =
  | { type: 'CLOSE_CONNECTION'; id: string; connection: WebSocket }
  | {
      type: 'CHANNEL_CHANGED';
      id: string;
      spaceId: string;
      channelId: string;
      channel: Channel | null;
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
  | {
      type: 'STATUS_UPDATED';
      id: string;
      spaceId: string;
      statusMap: Record<string, UserStatus | undefined>;
      dedupeKey: string;
    };
