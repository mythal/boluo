import { ONLINE_TIMEOUT } from '../settings';

export const isOnline = (timestamp?: number, now?: number) => {
  if (!timestamp) {
    return false;
  }
  now = now || new Date().getTime();
  return now - timestamp < ONLINE_TIMEOUT;
};
