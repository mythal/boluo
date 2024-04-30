import { Space } from '@boluo/api';
import { atom, useAtomValue } from 'jotai';
import { useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { chatAtom } from '../state/chat.atoms';
import { channelReadFamily } from '../state/unread.atoms';

const hasUnreadMessagesAtom = atom((read) => {
  const chatState = read(chatAtom);
  if (!chatState || !chatState.context.initialized) {
    return false;
  }
  const channels = Object.keys(chatState.channels);
  for (const channelId of channels) {
    const channel = chatState.channels[channelId]!;
    const readPos = read(channelReadFamily(channelId));
    for (let i = channel.messages.length - 1; i >= 0; i--) {
      const message = channel.messages[i]!;
      if (message.pos > readPos && !message.folded) {
        return true;
      }
    }
  }
  return false;
});

export const useTitle = (space: Space | null | undefined) => {
  const hasUnreadMessages = useAtomValue(hasUnreadMessagesAtom);
  const intl = useIntl();
  useEffect(() => {
    if (!space) {
      document.title = intl.formatMessage({ defaultMessage: 'Boluo' });
      return;
    }
    document.title = (hasUnreadMessages ? '(*) ' : '') + space.name;
  }, [hasUnreadMessages, intl, space]);
};
