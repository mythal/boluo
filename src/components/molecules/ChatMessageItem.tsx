import * as React from 'react';
import { Message } from '@/api/messages';
import { ChatItemContainer } from '@/components/atoms/ChatItemContainer';
import ChatItemTime from '@/components/atoms/ChatItemTime';
import ChatItemName from '@/components/atoms/ChatItemName';
import ChatItemContent from '@/components/atoms/ChatItemContent';

interface Props {
  message: Message;
}

function ChatMessageItem({ message }: Props) {
  return (
    <ChatItemContainer>
      <ChatItemTime timestamp={message.created} />
      <ChatItemName master={message.isMaster} name={message.name} userId={message.senderId} />
      <ChatItemContent action={message.isAction} text={message.text} />
    </ChatItemContainer>
  );
}

export default React.memo(ChatMessageItem);
