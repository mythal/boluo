import React from 'react';
import { Message } from './Message';
import { User } from '../user';
import { leadingZero } from '../utils';

export interface Props {
  message: Message;
  user?: User;
  remove: () => void;
}

const Time = ({ timestamp }: { timestamp: number }) => {
  const date = new Date(timestamp);
  const H = leadingZero(date.getHours());
  const M = leadingZero(date.getMinutes());
  return (
    <time dateTime={date.toISOString()}>
      {H}:{M}
    </time>
  );
};

export const MessageView = ({ message, user, remove }: Props) => {
  const handleClick: React.MouseEventHandler = e => {
    e.preventDefault();
    remove();
  };
  const deleteButton = <button onClick={handleClick}>Delete</button>;
  return (
    <div className="Message">
      <div>
        <Time timestamp={message.created} />
      </div>
      <div className="Message-speaker">{message.character}</div>
      <div className="Message-body">{message.text}</div>
      <div className="Message-footer">{user ? deleteButton : null}</div>
    </div>
  );
};
