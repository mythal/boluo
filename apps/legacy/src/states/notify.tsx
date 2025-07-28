import { atom, useAtom } from 'jotai';
import { showFlash } from '../actions';
import { useMyId } from '../hooks/useMyId';
import { useSelector } from '../store';

export const isNotificationSupported = 'Notification' in window;

export const canNotifyAtom = atom(isNotificationSupported && Notification.permission === 'granted');

export const useNotificationSwitch = (): {
  canNotify: boolean;
  startNotify: () => void;
  stopNotify: () => void;
} => {
  const [canNotify, setCanNotify] = useAtom(canNotifyAtom);

  const startNotify = async () => {
    if (!isNotificationSupported) {
      showFlash('WARNING', <span>您的设备不支持发送通知</span>);
      return;
    }
    if (Notification.permission !== 'granted') {
      const result = await Notification.requestPermission();
      if (result === 'denied') {
        showFlash('WARNING', <span>你拒绝了通知权限，无法显示通知</span>);
        return;
      }
    }
    setCanNotify(Notification.permission === 'granted');
    return;
  };
  const stopNotify = () => {
    setCanNotify(false);
  };
  return { canNotify, startNotify, stopNotify };
};

export const useNotify = () => {
  const latestMap = useSelector(
    (state) => {
      return state.chatStates.map((chatState) => {
        if (!chatState) {
          return undefined;
        } else {
          return chatState.itemSet.messages.last(undefined);
        }
      });
    },
    (a, b) => a.equals(b),
  );
  const myId = useMyId();
  const myChannel = useSelector((state) => state.profile?.channels);
  const focusChannelList = useSelector((state) => state.ui.focusChannelList);
  const [canNotify] = useAtom(canNotifyAtom);
  if (!isNotificationSupported || !myChannel || !canNotify) {
    return;
  }
  for (const [channelId, item] of latestMap.entries()) {
    if (!myChannel.has(channelId)) {
      continue;
    }
    if (!item || item.type !== 'MESSAGE') {
      continue;
    }
    const storageKey = `channel:${channelId}:latest`;
    const storagePrev = localStorage.getItem(storageKey);
    let prev: number | null = null;
    if (storagePrev) {
      const parsed = Date.parse(storagePrev);
      if (!Number.isNaN(parsed)) {
        prev = parsed;
      }
    }
    if (prev == null) {
      localStorage.setItem(storageKey, item.message.created);
      continue;
    }
    if (prev < Date.parse(item.message.created)) {
      localStorage.setItem(storageKey, item.message.created);
      if (
        (focusChannelList.includes(channelId) && document.visibilityState === 'visible') ||
        item.message.senderId === myId
      ) {
        continue;
      }
      const name = item.message.name;
      const text = item.message.text;
      const options: NotificationOptions & { renotify: boolean } = {
        body: `${name}: ${text}`,
        tag: channelId,
        renotify: true,
      };
      const newNotification = new Notification('菠萝 的新消息', options as NotificationOptions);
      const autoClouseTimeOut = 5000;
      newNotification.onshow = () => {
        setTimeout(() => {
          newNotification.close();
        }, autoClouseTimeOut);
      };
    }
  }
};
