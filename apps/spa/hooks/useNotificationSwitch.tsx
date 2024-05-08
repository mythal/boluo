import { useAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export const isNotificationSupported = 'Notification' in window;
const notificationEnableAtom = atomWithStorage<boolean>(
  'boluo-notification-v0',
  isNotificationSupported && Notification.permission === 'granted',
);

export const useNotificationSwitch = (): { canNotify: boolean; startNotify: () => void; stopNotify: () => void } => {
  const [notificationEnable, setNotificationEnable] = useAtom(notificationEnableAtom);
  const canNotify = isNotificationSupported && Notification.permission === 'granted' && notificationEnable;

  const startNotify = async () => {
    if (!isNotificationSupported) {
      return;
    }
    if (Notification.permission !== 'granted') {
      const result = await Notification.requestPermission();
      if (result === 'denied') {
        return;
      }
    }
    setNotificationEnable(Notification.permission === 'granted');
    return;
  };
  const stopNotify = () => {
    setNotificationEnable(false);
  };
  return { canNotify, startNotify, stopNotify };
};
