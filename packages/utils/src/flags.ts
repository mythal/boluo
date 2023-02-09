import { parseBool } from './env';

const getBoolFlag = (key: string, defaultValue = false): boolean => {
  if (globalThis.window?.localStorage) {
    const storage = globalThis.window.localStorage;
    const value = storage.getItem(key.toLowerCase());
    return parseBool(value);
  } else {
    return defaultValue;
  }
};

export const IS_DEBUG = getBoolFlag('DEBUG');
