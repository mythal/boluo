import { ChevronsDown } from '@boluo/icons';
import { memo, useMemo } from 'react';
import { Button } from '@boluo/ui/Button';
import { type ChatItem } from '../../state/channel.types';
import { channelReadFamily } from '../../state/unread.atoms';
import { useAtomValue } from 'jotai';

interface Props {
  onClick: () => void;
  chatList: ChatItem[];
  channelId: string;
}

export const GoButtomButton = memo<Props>(({ onClick, channelId, chatList }) => {
  const readPosition = useAtomValue(channelReadFamily(channelId));
  const unreadCount = useMemo(
    () =>
      chatList.filter((item) => {
        return item.type === 'MESSAGE' && item.pos > readPosition;
      }).length,
    [chatList, readPosition],
  );
  return (
    <Button onClick={onClick} className="absolute bottom-4 right-1/2 z-30 translate-x-1/2 text-lg shadow">
      {unreadCount > 0 ? (
        <>
          <ChevronsDown />
          <span className="bg-bottom-badge-bg text-bottom-badge-text absolute right-0 top-0 flex h-6 min-w-6 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full px-1 text-sm shadow">
            {unreadCount}
          </span>
        </>
      ) : (
        <ChevronsDown />
      )}
    </Button>
  );
});
GoButtomButton.displayName = 'GoButtomButton';
