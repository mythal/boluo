import { atom, useAtom } from 'jotai';
import { showFlash } from '../actions/flash';
import * as React from 'react';
import { useRef } from 'react';
import { Id } from '../utils/id';
import { useSelector } from '../store';
import { MessageItem, PreviewItem } from './chat-item-set';
import { Map } from 'immutable';
import { focusChannelAtom } from './focusChannel';

export const isNotificationSupported = 'Notification' in window;

export const canNotifyAtom = atom(isNotificationSupported && Notification.permission === 'granted');

export const useNotificationSwitch = (): { canNotify: boolean; startNotify: () => void; stopNotify: () => void } => {
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
  const stopNotify = async () => {
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
    (a, b) => a.equals(b)
  );
  const myChannel = useSelector((state) => state.profile?.channels);
  const [focusChannelSet] = useAtom(focusChannelAtom);
  const [canNotify] = useAtom(canNotifyAtom);
  if (!isNotificationSupported || !myChannel || !canNotify) {
    return;
  }
  for (const [channelId, item] of latestMap.entries()) {
    if (!myChannel.has(channelId)) {
      continue;
    }
    if (focusChannelSet.has(channelId)) {
      continue;
    }
    if (!item || item.type !== 'MESSAGE') {
      continue;
    }
    const storageKey = `channel:${channelId}:latest`;
    const storagePrev = localStorage.getItem(storageKey);
    const prev = storagePrev ? Number(storagePrev) : null;
    if (prev === null) {
      localStorage.setItem(storageKey, String(item.message.created));
      continue;
    }
    if (prev === null || prev < item.message.created) {
      const name = item.message.name;
      const text = item.message.text;
      new Notification('菠萝 的新消息', { body: `${name}: ${text}` });
      localStorage.setItem(storageKey, String(item.message.created));
    }
  }
};
