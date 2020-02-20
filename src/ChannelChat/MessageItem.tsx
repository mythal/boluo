import React from 'react';
import { Message } from '../api/messages';
import { ColorList } from '../api/channels';
import { MessageContent } from './MessageContent';

interface Props {
  message: Message;
  colorList: ColorList;
}

export const MessageItem: React.FC<Props> = ({ message, colorList }) => {
  const color = colorList[message.senderId] ?? undefined;
  return (
    <div style={{ color }}>
      <div>{message.name}</div>
      <MessageContent text={message.text} entities={message.entities} seed={message.seed} />
    </div>
  );
};
