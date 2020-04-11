import { ChannelWithRelated } from '../api/channels';
import { Id } from '../utils';
import { Message } from '../api/messages';
import { ChannelEvent } from '../api/events';

export interface LoadChat {
  type: 'LOAD_CHAT';
  channelWithRelated: ChannelWithRelated;
}

export interface CloseChat {
  type: 'CLOSE_CHAT';
  id: Id;
}

export interface LoadMessages {
  type: 'LOAD_MESSAGES';
  messages: Message[];
  finished: boolean;
}

export interface ChannelEventReceived {
  type: 'CHANNEL_EVENT_RECEIVED';
  event: ChannelEvent;
}
