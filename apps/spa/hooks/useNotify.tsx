import { useEffect, useMemo } from 'react';
import { useAtomValue, useStore } from 'jotai';
import { type ChannelWithMember, type Message } from '@boluo/api';
import { chatAtom, notifyTimestampAtom } from '../state/chat.atoms';
import { notificationEnableAtom } from '../state/notification.atoms';
import { useIntl } from 'react-intl';
import { messageToParsed, toSimpleText } from '@boluo/interpreter';
import { panesAtom } from '../state/view.atoms';
import { useQueryChannelList } from '@boluo/hooks/useQueryChannelList';
import { backwards } from 'list';

export const useNotify = (spaceId: string) => {
  const store = useStore();
  const intl = useIntl();
  const enabled = useAtomValue(notificationEnableAtom);
  const { data: channelWithMaybeMemberList } = useQueryChannelList(spaceId);
  const joinedChannels = useMemo(() => {
    if (!channelWithMaybeMemberList || channelWithMaybeMemberList.length === 0) {
      return [];
    }
    const channelWithMemberList: ChannelWithMember[] = [];
    for (const { channel, member } of channelWithMaybeMemberList) {
      if (member) {
        channelWithMemberList.push({ channel, member });
      }
    }
    return channelWithMemberList;
  }, [channelWithMaybeMemberList]);
  useEffect(() => {
    if (joinedChannels.length === 0 || !enabled) {
      return;
    }
    const myId = joinedChannels.find(({ member }) => member != null)?.member.userId;
    if (!myId) {
      return;
    }
    let startTime = new Date().getTime();
    return store.sub(notifyTimestampAtom, () => {
      const newMessages: Message[] = [];
      const chatState = store.get(chatAtom);
      if (!chatState || !chatState.context.initialized) {
        return;
      }
      for (const channelState of Object.values(chatState.channels)) {
        if (joinedChannels.findIndex(({ channel }) => channel.id === channelState.id) === -1) {
          continue;
        }
        let count = 0;
        for (const message of backwards(channelState.messages)) {
          const created = Date.parse(message.created);
          if (!Number.isNaN(created) && created > startTime) {
            newMessages.push(message);
          }
          if (++count >= 100) break;
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
        let notification: Notification | null = null;
        try {
          notification = new Notification(
            intl.formatMessage(
              { defaultMessage: 'New message from {name}' },
              { name: message.name },
            ),
            options,
          );
        } catch (error) {
          // Failed to construct Notification: Illegal constructor
          // https://stackoverflow.com/a/29915743
          // TODO: use ServiceWorker
        }
        if (notification) {
          notification.onclick = () => {
            window.focus();
            notification.close();
          };
        }
      }
      startTime = new Date().getTime();
    });
  }, [enabled, intl, store, joinedChannels]);
};
