import { type Message } from '@boluo/api';
import { type FC, useContext } from 'react';
import { useSetAtom } from 'jotai';
import { DisplayContext as ToolbarDisplayContext } from './MessageToolbar';
import { type FailTo } from '../../state/channel.types';
import { MessageTimeDisplay } from '@boluo/ui/chat/MessageTimeDisplay';

interface Props {
  message: Message;
  failTo: FailTo | null | undefined;
}

export const MessageTime: FC<Props> = ({ message, failTo }) => {
  const date = new Date(message.created);
  const setToolbarDisplay = useSetAtom(useContext(ToolbarDisplayContext));
  const edited = message.modified !== message.created;
  return (
    <MessageTimeDisplay
      failed={Boolean(failTo)}
      createdAt={date}
      edited={edited}
      onTouchEnd={(e) => {
        e.preventDefault();
        setToolbarDisplay({ type: 'MORE' });
      }}
    />
  );
};
