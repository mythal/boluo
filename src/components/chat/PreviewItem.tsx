import * as React from 'react';
import { Preview } from '../../api/events';
import { chatItemContainer } from '../atoms/ChatItemContainer';
import ChatItemTime from '../atoms/ChatItemTime';
import ChatItemName from '../atoms/ChatItemName';
import { previewStyle } from '../../styles/atoms';
import ChatItemContent from './ItemContent';
import { ChatItemContentContainer } from '../atoms/ChatItemContentContainer';

interface Props {
  preview: Preview;
}

function PreviewItem({ preview }: Props) {
  let { text, isAction, entities } = preview;

  if (text === '') {
    return null;
  }
  if (text === null) {
    text = '……（预览广播已关闭）……';
    entities = [{ type: 'Text', start: 0, offset: text.length }];
    isAction = true;
  }

  const name = (
    <ChatItemName action={isAction} master={preview.isMaster} name={preview.name} userId={preview.senderId} />
  );

  return (
    <div css={[chatItemContainer, previewStyle]} data-in-game={preview.inGame}>
      <ChatItemTime timestamp={preview.start} />
      {!isAction && name}
      <ChatItemContentContainer data-action={isAction} data-in-game={preview.inGame}>
        {isAction && name}
        <ChatItemContent entities={entities} text={text} />
      </ChatItemContentContainer>
    </div>
  );
}

export default React.memo(PreviewItem);
