import { atomWithStorage } from 'jotai/utils';

export const isNotificationSupported = typeof window !== 'undefined' && 'Notification' in window;
export const notificationEnableAtom = atomWithStorage<boolean>(
  'boluo-notification-v0',
  isNotificationSupported && Notification.permission === 'granted',
);
