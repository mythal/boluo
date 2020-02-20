import { Message } from '../api/messages';
import { ChannelEvent } from '../api/events';
import { Id } from '../id';

export const MESSAGES_LOADED = 'MESSAGES_LOADED';
export type MESSAGES_LOADED = typeof MESSAGES_LOADED;

export interface MessagesLoaded {
  tag: MESSAGES_LOADED;
  messages: Message[];
}

export const EVENTS_LOADED = 'EVENTS_LOADED';
export type EVENTS_LOADED = typeof EVENTS_LOADED;

export interface EventsLoaded {
  tag: EVENTS_LOADED;
  events: ChannelEvent[];
}

export const SWITCH_CHANNEL = 'SWITCH_CHANNEL';
export type SWITCH_CHANNEL = typeof SWITCH_CHANNEL;

export interface SwitchChannel {
  tag: SWITCH_CHANNEL;
  channelId: Id;
}

export type ChannelAction = MessagesLoaded | EventsLoaded | SwitchChannel;
