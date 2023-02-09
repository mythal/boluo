import type { Theme } from 'ui';
import type { Locale } from './locale';

export interface Settings {
  locale?: Locale;
  theme?: Theme;
  enterSend?: boolean;
  expandDice?: boolean;
}

export const defaultSettings: Settings = {};

export const toSettings = (rawSettings: unknown): Settings => {
  if (!rawSettings || typeof rawSettings !== 'object') {
    return defaultSettings;
  }
  return rawSettings as Settings;
};
