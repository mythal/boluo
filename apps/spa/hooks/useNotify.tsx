import { useEffect } from 'react';
import { useAtomValue, useStore } from 'jotai';
import { Message } from '@boluo/api';
import { chatAtom } from '../state/chat.atoms';
import { notificationEnableAtom } from '../state/notification.atoms';
import { useIntl } from 'react-intl';
import { toSimpleText } from '../interpreter/entities';
import { messageToParsed } from '../interpreter/to-parsed';
import { useQueryUser } from '@boluo/common';
import { panesAtom } from '../state/view.atoms';

export const useNotify = () => {
  const store = useStore();
  const intl = useIntl();
  const { data: currentUser } = useQueryUser();
  const enabled = useAtomValue(notificationEnableAtom);
  const myId = currentUser?.id;
  useEffect(() => {
    if (!enabled) {
      return;
    }
    let startTime = new Date().getTime();
    const handle = window.setInterval(() => {
      const newMessages: Message[] = [];
      const chatState = store.get(chatAtom);
      for (const channelState of Object.values(chatState.channels)) {
        const length = channelState.messages.length;
        for (let i = length - 1; i >= Math.max(0, length - 100); i--) {
          const message = channelState.messages[i]!;
          const created = Date.parse(message.created);
          if (!Number.isNaN(created) && created > startTime) {
            newMessages.push(message);
          }
        }
      }
      const panes = store.get(panesAtom);
      const openedChannels: string[] = [];
      for (const pane of panes) {
        if (pane.type === 'CHANNEL') {
          openedChannels.push(pane.channelId);
        }
      }

      for (const message of newMessages) {
        if (openedChannels.includes(message.channelId) && document.visibilityState === 'visible') {
          continue;
        }
        if (message.senderId === myId) {
          continue;
        }
        const parsed = messageToParsed(message.text, message.entities);
        const text = toSimpleText(parsed.text, parsed.entities);
        const options = {
          body: text,
          tag: message.channelId,
          renotify: true,
        } as NotificationOptions;
        const notification = new Notification(
          intl.formatMessage({ defaultMessage: 'New message from {name}' }, { name: message.name }),
          options,
        );
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      }
      startTime = new Date().getTime();
    }, 1000);
    return () => window.clearInterval(handle);
  }, [enabled, intl, myId, store]);
};
