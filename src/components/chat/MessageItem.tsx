import * as React from 'react';
import { Message } from '../../api/messages';
import { chatItemContainer } from '../atoms/ChatItemContainer';
import ChatItemTime from '../atoms/ChatItemTime';
import ChatItemName from '../atoms/ChatItemName';
import ChatItemContent from './ItemContent';
import { ChatItemContentContainer } from '../atoms/ChatItemContentContainer';
import { DraggableProvidedDragHandleProps } from 'react-beautiful-dnd';
import { ChannelMember } from '../../api/channels';
import ChatMessageToolbar from './MessageToolbar';
import { useEffect, useState } from 'react';
import MessageMedia from './MessageMedia';

interface Props {
  message: Message;
  mine?: boolean;
  myMember?: ChannelMember;
  style?: React.CSSProperties;
  handleProps?: DraggableProvidedDragHandleProps;
  moving?: boolean;
}

function MessageItem({ message, mine = false, style, handleProps, myMember, moving = false }: Props) {
  const [lazy, setLazy] = useState(true);
  useEffect(() => {
    const timeout = window.setTimeout(() => setLazy(false), 200);
    return () => window.clearTimeout(timeout);
  }, []);
  const name = (
    <ChatItemName action={message.isAction} master={message.isMaster} name={message.name} userId={message.senderId} />
  );
  return (
    <div css={chatItemContainer} style={style} data-in-game={message.inGame} data-moving={moving}>
      <ChatItemTime timestamp={message.created} handleProps={handleProps} />
      {!message.isAction && name}
      <ChatItemContentContainer
        data-in-game={message.inGame}
        data-action={message.isAction}
        data-folded={message.folded}
      >
        <MessageMedia mediaId={message.mediaId} />
        {message.isAction && name}
        <ChatItemContent entities={message.entities} seed={message.seed} text={message.text} />
      </ChatItemContentContainer>
      {myMember && !lazy && <ChatMessageToolbar mine={mine} message={message} myMember={myMember} />}
    </div>
  );
}

export default React.memo(MessageItem);
