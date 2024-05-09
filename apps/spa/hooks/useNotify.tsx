import { useEffect, useMemo } from 'react';
import { useAtomValue, useStore } from 'jotai';
import { ChannelWithMember, Message } from '@boluo/api';
import { chatAtom, notifyTimestampAtom } from '../state/chat.atoms';
import { notificationEnableAtom } from '../state/notification.atoms';
import { useIntl } from 'react-intl';
import { toSimpleText } from '../interpreter/entities';
import { messageToParsed } from '../interpreter/to-parsed';
import { panesAtom } from '../state/view.atoms';
import { useQueryChannelList } from './useQueryChannelList';

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
    });
  }, [enabled, intl, store, joinedChannels]);
};
