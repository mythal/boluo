import * as React from 'react';
import { Preview } from '../../../api/events';
import { chatItemContainer } from '../ChatItemContainer';
import ChatItemName from '../ChatItemName';
import ChatItemContent from '../ItemContent';
import { ChatItemContentContainer } from '../ChatItemContentContainer';
import { nameContainer, previewInGame, previewOutGame } from '../styles';
import { css } from '@emotion/core';
import { mL, textXs } from '../../../styles/atoms';
import MyPreviewName from './MyPreviewName';
import { useUpdateAtom } from 'jotai/utils';
import { sourceAtom } from './state';
import { useCallback } from 'react';
import { useChannelId } from '../../../hooks/useChannelId';
import { AddDiceButton } from './AddDiceButton';
import ChatImageUploadButton from './ImageUploadButton';

interface Props {
  preview: Preview;
}

const previewChatItem = css`
  & .roll::before {
    content: '未定';
    ${textXs}
  }
`;

function MyPreview({ preview }: Props) {
  let { text, isAction, entities } = preview;
  const enableBroadcast = text !== null;

  if (!enableBroadcast) {
    text = '[预览广播已关闭]';
    entities = [{ type: 'Text', start: 0, offset: text.length }];
    isAction = true;
  }

  const name = <MyPreviewName />;

  return (
    <div
      css={[chatItemContainer, previewChatItem, preview.inGame ? previewInGame : previewOutGame]}
      data-in-game={preview.inGame}
    >
      {!isAction && <div css={nameContainer}>{name}</div>}
      <ChatItemContentContainer data-action={isAction} data-in-game={preview.inGame}>
        {isAction && name}
        {text && <ChatItemContent entities={entities} text={text} />}
        <AddDiceButton />
        <ChatImageUploadButton css={[mL(1)]} />
      </ChatItemContentContainer>
    </div>
  );
}

export default React.memo(MyPreview);
