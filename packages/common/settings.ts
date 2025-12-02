import type { Locale } from '@boluo/api';
import type { Theme } from '@boluo/theme';

export interface Settings {
  locale?: Locale;
  theme?: Theme;
  enterSend?: boolean;
  expandDice?: boolean;
  alignToBottom?: boolean;
}

export const defaultSettings: Settings = {};

export const toSettings = (rawSettings: unknown): Settings => {
  if (!rawSettings || typeof rawSettings !== 'object') {
    return defaultSettings;
  }
  return rawSettings as Settings;
};
