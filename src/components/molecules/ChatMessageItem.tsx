import * as React from 'react';
import { Message } from '@/api/messages';
import { ChatItemContainer } from '@/components/atoms/ChatItemContainer';
import ChatItemTime from '@/components/atoms/ChatItemTime';
import ChatItemName from '@/components/atoms/ChatItemName';
import ChatItemContent from '@/components/molecules/ChatItemContent';

interface Props {
  message: Message;
}

function ChatMessageItem({ message }: Props) {
  return (
    <ChatItemContainer data-in-game={message.inGame}>
      <ChatItemTime timestamp={message.created} />
      <ChatItemName action={message.isAction} master={message.isMaster} name={message.name} userId={message.senderId} />
      <ChatItemContent
        entities={message.entities}
        seed={message.seed}
        inGame={message.inGame}
        action={message.isAction}
        text={message.text}
      />
    </ChatItemContainer>
  );
}

export default React.memo(ChatMessageItem);
