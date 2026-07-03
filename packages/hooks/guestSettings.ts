import type { Settings } from '@boluo/settings';
import { defaultSettings, toSettings } from '@boluo/settings';

const GUEST_SETTINGS_KEY = 'BOLUO_GUEST_SETTINGS_V1';

const getStorage = (): Storage | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.localStorage;
};

export const readGuestSettings = (): Settings => {
  const storage = getStorage();
  if (storage == null) {
    return defaultSettings;
  }
  const raw = storage.getItem(GUEST_SETTINGS_KEY);
  if (raw == null) {
    return defaultSettings;
  }
  try {
    return toSettings(JSON.parse(raw));
  } catch {
    return defaultSettings;
  }
};

export const writeGuestSettings = (settings: Settings): void => {
  const storage = getStorage();
  if (storage == null) {
    return;
  }
  storage.setItem(GUEST_SETTINGS_KEY, JSON.stringify(settings));
};
