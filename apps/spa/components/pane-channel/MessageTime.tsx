import { Message } from '@boluo/api';
import { FC, useContext } from 'react';
import { generateDetailDate, pad } from '../../date';
import { useSetAtom } from 'jotai';
import { DisplayContext as ToolbarDisplayContext } from './MessageToolbar';

interface Props {
  message: Message;
}

export const MessageTime: FC<Props> = ({ message }) => {
  const date = new Date(message.created);
  const setToolbarDisplay = useSetAtom(useContext(ToolbarDisplayContext));
  const edited = message.modified !== message.created;
  return (
    <time
      data-edited={edited}
      className="text-text-lighter text-xs decoration-dotted data-[edited=true]:underline"
      dateTime={message.created}
      title={generateDetailDate(date)}
      onTouchEnd={(e) => {
        e.preventDefault();

        setToolbarDisplay({ type: 'MORE' });
      }}
    >
      {pad(date.getHours())}:{pad(date.getMinutes())}
    </time>
  );
};
