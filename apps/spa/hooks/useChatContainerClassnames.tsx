import { type Settings } from '@boluo/settings';
import { useSettings } from './useSettings';
import clsx from 'clsx';

export const settingsToClassnames = (settings: Partial<Settings>) => {
  return clsx(settings.layout ?? 'irc-layout', settings.messageSize, settings.inGameFont);
};

export const useChatContainerClassnames = () => {
  const settings = useSettings();
  return settingsToClassnames(settings);
};
