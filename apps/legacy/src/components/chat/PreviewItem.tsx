import * as React from 'react';
import { type Preview } from '../../api/events';
import { ChatItemContentContainer } from './ChatItemContentContainer';
import ChatItemName from './ChatItemName';
import ChatItemContent from './ItemContent';
import { chatItemContainerClassName, chatItemNameContainerClassName } from './classNames';

interface Props {
  preview: Preview;
}

function PreviewItem({ preview }: Props) {
  let { text, isAction = false, entities } = preview;

  if (text == null) {
    text = '……（预览广播已关闭）……';
    entities = [{ type: 'Text', start: 0, len: text.length }];
    isAction = true;
  }

  const name = (
    <ChatItemName
      inGame={preview.inGame ?? false}
      action={isAction ?? false}
      master={preview.isMaster ?? false}
      name={preview.name || '无名氏'}
      userId={preview.senderId}
    />
  );

  return (
    <div
      className={`${chatItemContainerClassName} legacy-chat-preview ${
        preview.inGame ? 'legacy-chat-preview-in-game' : 'legacy-chat-preview-out-game'
      }`}
      data-in-game={preview.inGame ?? false}
    >
      {!isAction && <div className={chatItemNameContainerClassName}>{name}</div>}
      <ChatItemContentContainer data-action={isAction} data-in-game={preview.inGame ?? false}>
        {isAction && name}
        <ChatItemContent entities={entities} text={text} />
      </ChatItemContentContainer>
    </div>
  );
}

export default React.memo(PreviewItem);
