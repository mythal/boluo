import React from 'react';
import { Message } from './Message';
import { User } from '../user';

export interface Props {
  message: Message;
  user?: User;
  remove: () => void;
}

export const MessageView = ({ message, user, remove }: Props) => {
  const handleClick: React.MouseEventHandler = e => {
    e.preventDefault();
    remove();
  };
  return (
    <div className="Message">
      <div className="Message-speaker">{message.character}</div>
      <div className="Message-body">&lt;&gt; {message.text}</div>
      <div className="Message-footer">
        {user ? (
          <a href="#" onClick={handleClick}>
            delete
          </a>
        ) : null}
      </div>
    </div>
  );
};
