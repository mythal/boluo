import type { Message } from 'boluo-api';
import type { FC } from 'react';

interface Props {
  message: Message;
  className: string;
}

export const MessageListItem: FC<Props> = ({ message, className }) => {
  return (
    <div className={className}>
      <span className="font-bold">{message.name}</span>: {message.text}
    </div>
  );
};
