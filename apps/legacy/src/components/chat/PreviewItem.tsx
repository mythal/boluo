import { css } from '@emotion/react';
import * as React from 'react';
import { type Preview } from '../../api/events';
import { textXs } from '../../styles/atoms';
import { chatItemContainer } from './ChatItemContainer';
import { ChatItemContentContainer } from './ChatItemContentContainer';
import ChatItemName from './ChatItemName';
import ChatItemContent from './ItemContent';
import { nameContainer, previewInGame, previewOutGame } from './styles';

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
      css={[chatItemContainer, previewChatItem, preview.inGame ? previewInGame : previewOutGame]}
      data-in-game={preview.inGame ?? false}
    >
      {!isAction && <div css={nameContainer}>{name}</div>}
      <ChatItemContentContainer data-action={isAction} data-in-game={preview.inGame ?? false}>
        {isAction && name}
        <ChatItemContent entities={entities} text={text} />
      </ChatItemContentContainer>
    </div>
  );
}

export default React.memo(PreviewItem);
