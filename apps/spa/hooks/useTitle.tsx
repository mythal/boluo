import { type ChannelWithMaybeMember, type Space } from '@boluo/api';
import { atom, useStore, type createStore } from 'jotai';
import { useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { chatAtom, notifyTimestampAtom } from '../state/chat.atoms';
import { channelReadFamily } from '../state/unread.atoms';
import { useQueryChannelList } from '@boluo/hooks/useQueryChannelList';
import { backwards } from 'list';

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
    if (channelWithMaybeMemberList.findIndex(({ channel }) => channel.id === channelId) === -1)
      continue;
    const channel = chatState.channels[channelId]!;
    const readPos = store.get(channelReadFamily(channelId));
    let count = 0;
    for (const message of backwards(channel.messages)) {
      if (myId != null && message.senderId === myId) continue;
      else if (message.pos > readPos && !message.folded) {
        // console.debug('[UNREAD]', message);
        return true;
      } else if (++count >= 100) break;
    }
  }
  return false;
};

export const useTitle = (spaceId: string, space: Space | null | undefined) => {
  const { data: channelWithMaybeMemberList } = useQueryChannelList(spaceId);
  const store = useStore();
  const intl = useIntl();
  const readPosMapAtom = useMemo(
    () =>
      atom((read): Record<string, number> => {
        if (!channelWithMaybeMemberList || channelWithMaybeMemberList.length === 0) return {};
        const posMap: Record<string, number> = {};
        for (const { channel } of channelWithMaybeMemberList) {
          const pos = read(channelReadFamily(channel.id));
          posMap[channel.id] = pos;
        }
        return posMap;
      }),
    [channelWithMaybeMemberList],
  );
  useEffect(() => {
    if (!space) {
      document.title = intl.formatMessage({ defaultMessage: 'Boluo' });
      return;
    }
    const update = () => {
      const chatState = store.get(chatAtom);

      if (!chatState || !chatState.context.initialized) {
        return false;
      }
      document.title =
        (hasUnreadMessages(store, channelWithMaybeMemberList) ? '(*) ' : '') + space.name;
    };
    update();
    const unsubNotificationTimestamp = store.sub(notifyTimestampAtom, update);
    const unsubReadPosMap = store.sub(readPosMapAtom, update);
    return () => {
      unsubNotificationTimestamp();
      unsubReadPosMap();
    };
  }, [intl, space, store, channelWithMaybeMemberList, readPosMapAtom]);
};
