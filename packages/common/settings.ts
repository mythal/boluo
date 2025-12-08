import type { Locale } from '@boluo/api';
import type { Theme } from '@boluo/theme';

export type MessageSize = 'message-size-normal' | 'message-size-large';
export type ChannelLayout = 'irc-layout' | 'compact-layout';

export interface Settings {
  locale?: Locale;
  theme?: Theme;
  enterSend?: boolean;
  expandDice?: boolean;
  alignToBottom?: boolean;
  messageSize?: MessageSize;
  layout?: ChannelLayout;
}

export const defaultSettings: Settings = {};

export const toSettings = (rawSettings: unknown): Settings => {
  if (!rawSettings || typeof rawSettings !== 'object') {
    return defaultSettings;
  }
  return rawSettings as Settings;
};
