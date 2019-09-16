import React from 'react';
import { Message } from './Message';

export interface Props {
  message: Message;
}

export const MessageView = ({ message }: Props) => {
  return (
    <p>
      &lt;{message.character}&gt; {message.text}
    </p>
  );
};
