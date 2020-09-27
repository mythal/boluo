import * as React from 'react';
import { Preview } from '../../api/events';
import { chatItemContainer } from './ChatItemContainer';
import ChatItemName from './ChatItemName';
import ChatItemContent from './ItemContent';
import { ChatItemContentContainer } from './ChatItemContentContainer';
import { nameContainer, previewInGame, previewOutGame } from './styles';
import { css } from '@emotion/core';
import { textXs } from '../../styles/atoms';

interface Props {
  preview: Preview;
}

const previewChatItem = css`
  & .roll::before {
    content: '未定';
    ${textXs}
  }
`;

function PreviewItem({ preview }: Props) {
  let { text, isAction, entities } = preview;

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
      name={preview.name || '无名氏'}
      userId={preview.senderId}
    />
  );

  return (
    <div
      css={[chatItemContainer, previewChatItem, preview.inGame ? previewInGame : previewOutGame]}
      data-in-game={preview.inGame}
    >
      {!isAction && <div css={nameContainer}>{name}</div>}
      <ChatItemContentContainer data-action={isAction} data-in-game={preview.inGame}>
        {isAction && name}
        <ChatItemContent entities={entities} text={text} />
      </ChatItemContentContainer>
    </div>
  );
}

export default React.memo(PreviewItem);
