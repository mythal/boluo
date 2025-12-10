import * as React from 'react';
import { useEffect, useState } from 'react';
import { type DraggableProvidedDragHandleProps } from '@hello-pangea/dnd';
import { type ChannelMember } from '../../api/channels';
import { type Message } from '../../api/messages';
import { chatItemContainer } from './ChatItemContainer';
import { ChatItemContentContainer } from './ChatItemContentContainer';
import ChatItemName from './ChatItemName';
import ChatItemContent from './ItemContent';
import Handle from './ItemMoveHandle';
import MessageMedia from './MessageMedia';
import MessageTime from './MessageTime';
import ChatMessageToolbar from './MessageToolbar';
import MessageWhisperList from './MessageWhisperList';
import { itemImage, nameContainer } from './styles';

interface Props {
  message: Message;
  mine?: boolean;
  myMember?: ChannelMember;
  style?: React.CSSProperties;
  handleProps?: DraggableProvidedDragHandleProps | null;
  moving?: boolean;
  sameSender?: boolean;
}

function MessageItem({
  message,
  mine = false,
  style,
  handleProps,
  myMember,
  moving = false,
  sameSender = false,
}: Props) {
  const [lazy, setLazy] = useState(true);
  useEffect(() => {
    const timeout = window.setTimeout(() => setLazy(false), 200);
    return () => window.clearTimeout(timeout);
  }, []);
  const name = (
    <ChatItemName
      inGame={message.inGame ?? false}
      action={message.isAction ?? false}
      master={message.isMaster ?? false}
      name={message.name}
      userId={message.senderId}
    />
  );

  let content: React.ReactNode;
  if (message.whisperToUsers == null || message.entities.length > 0) {
    content = (
      <ChatItemContentContainer
        data-in-game={message.inGame ?? false}
        data-action={message.isAction ?? false}
        data-folded={message.folded ?? false}
      >
        <MessageMedia css={itemImage} mediaId={message.mediaId} />
        {message.isAction && name}
        {message.whisperToUsers != null && (
          <MessageWhisperList message={message} myMember={myMember} shown />
        )}
        <ChatItemContent entities={message.entities} seed={message.seed} text={message.text} />
        <MessageTime created={message.created} modified={message.modified} />
      </ChatItemContentContainer>
    );
  } else {
    content = <MessageWhisperList message={message} myMember={myMember} />;
  }
  const renderName = !message.isAction && !sameSender;
  return (
    <div
      css={chatItemContainer}
      style={style}
      data-no-name={!renderName}
      data-in-game={message.inGame ?? false}
      data-moving={moving}
    >
      {handleProps && <Handle timestamp={message.created} handleProps={handleProps} />}
      {renderName && <div css={nameContainer}>{name}</div>}
      {content}
      {myMember && !lazy && (
        <ChatMessageToolbar key={message.id} mine={mine} message={message} myMember={myMember} />
      )}
    </div>
  );
}

export default React.memo(MessageItem);
