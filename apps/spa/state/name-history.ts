import { backwards, last } from 'list';
import type { ChatSpaceState } from './chat.reducer';
import type { ChannelState } from './channel.reducer';

export interface NameHistoryOptions {
  state: ChatSpaceState;
  userId: string;
  spaceId?: string;
  preferredChannelId?: string;
  seedNames?: string[];
  preferredLimit?: number;
  otherLimit?: number;
  totalLimit?: number;
}

const normalizeSeedNames = (seedNames: string[] | undefined): string[] => {
  if (!seedNames || seedNames.length === 0) return [];
  const names: string[] = [];
  for (const name of seedNames) {
    const trimmed = name.trim();
    if (trimmed !== '' && !names.includes(trimmed)) {
      names.push(trimmed);
    }
  }
  return names;
};

const pushName = (names: string[], seen: Set<string>, value: string): boolean => {
  const trimmed = value.trim();
  if (trimmed === '' || seen.has(trimmed)) return false;
  names.push(trimmed);
  seen.add(trimmed);
  return true;
};

const searchChannelForNames = (
  names: string[],
  seen: Set<string>,
  channelState: ChannelState,
  userId: string,
  searchLimit: number,
  totalLimit: number | undefined,
): boolean => {
  let count = 0;
  for (const message of backwards(channelState.messages)) {
    if (!message.inGame || message.folded || message.senderId !== userId) {
      continue;
    }
    if (pushName(names, seen, message.name)) {
      count += 1;
      if (totalLimit != null && names.length >= totalLimit) {
        return true;
      }
      if (count >= searchLimit) {
        break;
      }
    }
  }
  return false;
};

const getChannelTimestamp = (channel: ChannelState): number => {
  const lastMessage = last(channel.messages);
  if (!lastMessage) return 0;
  const timestamp = Date.parse(lastMessage.created);
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

export const collectCharacterNameHistory = ({
  state,
  userId,
  spaceId,
  preferredChannelId,
  seedNames,
  preferredLimit = 2000,
  otherLimit = 100,
  totalLimit,
}: NameHistoryOptions): string[] => {
  const names = normalizeSeedNames(seedNames);
  const seen = new Set(names);
  if (spaceId && state.context.spaceId !== spaceId) {
    return names;
  }

  const preferredChannel = preferredChannelId ? state.channels[preferredChannelId] : undefined;
  if (preferredChannel) {
    if (searchChannelForNames(names, seen, preferredChannel, userId, preferredLimit, totalLimit)) {
      return names;
    }
  }

  const channels = Object.values(state.channels)
    .filter((channel) => channel.id !== preferredChannel?.id && channel.messages.length > 0)
    .map((channel) => ({ channel, time: getChannelTimestamp(channel) }))
    .filter((entry) => entry.time > 0)
    .sort((a, b) => b.time - a.time);

  for (const { channel } of channels) {
    if (searchChannelForNames(names, seen, channel, userId, otherLimit, totalLimit)) {
      break;
    }
  }

  return names;
};
