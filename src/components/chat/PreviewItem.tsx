import * as React from 'react';
import { Preview } from '../../api/events';
import { chatItemContainer } from './ChatItemContainer';
import ChatItemTime from './ChatItemTime';
import ChatItemName from './ChatItemName';
import ChatItemContent from './ItemContent';
import { ChatItemContentContainer } from './ChatItemContentContainer';
import { nameContainer, previewInGame, previewOutGame } from './styles';

interface Props {
  preview: Preview;
  measure: () => void;
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
    <ChatItemName
      inGame={preview.inGame}
      action={isAction}
      master={preview.isMaster}
      name={preview.name}
      userId={preview.senderId}
    />
  );

  return (
    <div css={[chatItemContainer, preview.inGame ? previewInGame : previewOutGame]} data-in-game={preview.inGame}>
      <ChatItemTime timestamp={preview.start} />
      {!isAction && <div css={nameContainer}>{name}</div>}
      <ChatItemContentContainer data-action={isAction} data-in-game={preview.inGame}>
        {isAction && name}
        <ChatItemContent entities={entities} text={text} />
      </ChatItemContentContainer>
    </div>
  );
}

export default React.memo(PreviewItem);
