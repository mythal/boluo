import { atom, useAtom } from 'jotai';
import { showFlash } from '../actions/flash';
import * as React from 'react';
import { useRef } from 'react';
import { Id } from '../utils/id';
import { useSelector } from '../store';
import { MessageItem, PreviewItem } from './chat-item-set';
import { Map } from 'immutable';
import { focusChannelAtom } from './focusChannel';

export const canNotifyAtom = atom(Notification.permission === 'granted');

export const useNotificationSwitch = (): { canNotify: boolean; startNotify: () => void; stopNotify: () => void } => {
  const [canNotify, setCanNotify] = useAtom(canNotifyAtom);

  const startNotify = async () => {
    if (Notification.permission !== 'granted') {
      const result = await Notification.requestPermission();
      if (result === 'denied') {
        showFlash('WARNING', <span>你拒绝了通知权限，无法显示通知</span>);
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
  const [focusChannelSet] = useAtom(focusChannelAtom);
  for (const [key, item] of latestMap.entries()) {
    if (focusChannelSet.has(key)) {
      continue;
    }
    if (!item || item.type !== 'MESSAGE') {
      continue;
    }
    const storageKey = `channel:${key}:latest`;
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
