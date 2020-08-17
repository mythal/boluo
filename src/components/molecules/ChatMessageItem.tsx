import * as React from 'react';
import { Message } from '../../api/messages';
import { ChatItemContainer } from '../atoms/ChatItemContainer';
import ChatItemTime from '../../components/atoms/ChatItemTime';
import ChatItemName from '../../components/atoms/ChatItemName';
import ChatItemContent from '../../components/molecules/ChatItemContent';
import { useDispatch } from '../../store';
import { ChatItemContentContainer } from '../atoms/ChatItemContentContainer';
import ChatItemToolbar from '../../components/molecules/ChatItemToolbar';
import editIcon from '../../assets/icons/edit.svg';
import ChatItemToolbarButton from '../atoms/ChatItemToolbarButton';

interface Props {
  message: Message;
  mine?: boolean;
  style?: React.CSSProperties;
}

function ChatMessageItem({ message, mine = false, style }: Props) {
  const dispatch = useDispatch();
  const startEdit = () => {
    dispatch({ type: 'START_EDIT_MESSAGE', message: message });
  };
  const name = (
    <ChatItemName action={message.isAction} master={message.isMaster} name={message.name} userId={message.senderId} />
  );
  return (
    <ChatItemContainer style={style} data-in-game={message.inGame}>
      <ChatItemTime timestamp={message.created} />
      {!message.isAction && name}
      <ChatItemContentContainer data-in-game={message.inGame} data-action={message.isAction}>
        {message.isAction && name}
        <ChatItemContent entities={message.entities} seed={message.seed} text={message.text} />
      </ChatItemContentContainer>
      {mine && (
        <ChatItemToolbar className="show-on-hover">
          <ChatItemToolbarButton onClick={startEdit} sprite={editIcon} title="编辑" />
        </ChatItemToolbar>
      )}
    </ChatItemContainer>
  );
}

export default React.memo(ChatMessageItem);
