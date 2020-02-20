import React from 'react';
import { Message } from '../api/messages';
import { ColorList } from '../api/channels';
import { ShowMessageLike } from './ShowMessageLike';

interface Props {
  message: Message;
  colorList: ColorList;
}

export const MessageItem: React.FC<Props> = ({ message, colorList }) => {
  const color = colorList[message.senderId] ?? undefined;
  return (
    <ShowMessageLike
      isAction={message.isAction}
      isMaster={message.isMaster}
      inGame={message.inGame}
      name={message.name}
      text={message.text}
      entities={message.entities}
      isPreview={false}
      seed={message.seed}
      color={color}
    />
  );
};
