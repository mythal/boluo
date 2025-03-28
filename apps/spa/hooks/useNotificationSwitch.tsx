import { useAtom } from 'jotai';
import { isNotificationSupported, notificationEnableAtom } from '../state/notification.atoms';
import { useIntl } from 'react-intl';

export const useNotificationSwitch = (): {
  canNotify: boolean;
  startNotify: () => void;
  stopNotify: () => void;
} => {
  const [notificationEnable, setNotificationEnable] = useAtom(notificationEnableAtom);
  const canNotify =
    isNotificationSupported && Notification.permission === 'granted' && notificationEnable;
  const intl = useIntl();

  const startNotify = async () => {
    if (!isNotificationSupported) {
      alert(
        intl.formatMessage({
          defaultMessage: 'Your device does not support sending notifications.',
        }),
      );
      return;
    }
    if (Notification.permission !== 'granted') {
      const result = await Notification.requestPermission();
      if (result === 'denied') {
        alert(intl.formatMessage({ defaultMessage: 'You have denied notification permission.' }));
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
