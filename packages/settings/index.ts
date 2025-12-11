import type { Locale, Theme } from '@boluo/types';

export type MessageSize = 'message-size-normal' | 'message-size-large';
export type ChannelLayout = 'irc-layout' | 'compact-layout';
export type InGameFont = 'in-game-serif' | 'in-game-sans-serif';

export interface Settings {
  locale?: Locale;
  theme?: Theme;
  enterSend?: boolean;
  expandDice?: boolean;
  alignToBottom?: boolean;
  messageSize?: MessageSize;
  layout?: ChannelLayout;
  inGameFont?: InGameFont;
  customThemeCss?: string;
  customThemeEnabled?: boolean;
}

export const defaultSettings: Settings = {};

export const toSettings = (rawSettings: unknown): Settings => {
  if (!rawSettings || typeof rawSettings !== 'object') {
    return defaultSettings;
  }
  return rawSettings as Settings;
};
