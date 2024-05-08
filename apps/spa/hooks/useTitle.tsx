import { ChannelWithMaybeMember, ChannelWithMember, Space } from '@boluo/api';
import { useStore, type createStore } from 'jotai';
import { useEffect } from 'react';
import { useIntl } from 'react-intl';
import { chatAtom } from '../state/chat.atoms';
import { channelReadFamily } from '../state/unread.atoms';
import { useQueryChannelList } from './useQueryChannelList';

const hasUnreadMessages = (
  store: ReturnType<typeof createStore>,
  channelWithMaybeMemberList: ChannelWithMaybeMember[] | undefined,
) => {
  if (!channelWithMaybeMemberList || channelWithMaybeMemberList.length === 0) return false;
  const chatState = store.get(chatAtom);
  if (!chatState || !chatState.context.initialized) {
    return false;
  }
  let myId: string | undefined;
  for (const { member } of channelWithMaybeMemberList) {
    if (member != null) {
      myId = member.userId;
      break;
    }
  }
  const channels = Object.keys(chatState.channels);
  for (const channelId of channels) {
    if (channelWithMaybeMemberList.findIndex(({ channel }) => channel.id === channelId) === -1) continue;
    const channel = chatState.channels[channelId]!;
    const readPos = store.get(channelReadFamily(channelId));
    const len = channel.messages.length;
    for (let i = len - 1; i >= Math.max(0, len - 100); i--) {
      const message = channel.messages[i]!;
      if (myId != null && message.senderId === myId) continue;
      if (message.pos > readPos && !message.folded) {
        return true;
      }
    }
  }
  return false;
};

export const useTitle = (spaceId: string, space: Space | null | undefined) => {
  const { data: channelWithMaybeMemberList } = useQueryChannelList(spaceId);
  const store = useStore();
  const intl = useIntl();
  useEffect(() => {
    if (!space) {
      document.title = intl.formatMessage({ defaultMessage: 'Boluo' });
      return;
    }

    const handle = window.setInterval(() => {
      const chatState = store.get(chatAtom);

      if (!chatState || !chatState.context.initialized) {
        return false;
      }
      document.title = (hasUnreadMessages(store, channelWithMaybeMemberList) ? '(*) ' : '') + space.name;
    }, 3000);
    return () => {
      clearInterval(handle);
    };
  }, [intl, space, store, channelWithMaybeMemberList]);
};
