import ChevronsDown from '@boluo/icons/ChevronsDown';
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

export const GoBottomButton = memo<Props>(({ onClick, channelId, chatList }: Props) => {
  const readPosition = useAtomValue(channelReadFamily(channelId));
  const unreadCount = useMemo(
    () =>
      chatList.filter((item) => {
        return item.type === 'MESSAGE' && item.pos > readPosition;
      }).length,
    [chatList, readPosition],
  );
  return (
    <Button
      onClick={onClick}
      className="GoBottomButton absolute right-1/2 bottom-4 z-30 translate-x-1/2 text-lg shadow"
    >
      <ChevronsDown />
      {unreadCount > 0 && (
        <span className="bg-action-primary-bg text-action-primary-text absolute top-0 right-0 flex h-6 min-w-6 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full px-1 text-sm shadow">
          {unreadCount}
        </span>
      )}
    </Button>
  );
});
GoBottomButton.displayName = 'GoBottomButton';
