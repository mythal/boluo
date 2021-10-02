import * as React from 'react';
import { Preview } from '../../../api/events';
import { chatItemContainer } from '../ChatItemContainer';
import ChatItemName from '../ChatItemName';
import ChatItemContent from '../ItemContent';
import { ChatItemContentContainer } from '../ChatItemContentContainer';
import { nameContainer, previewInGame, previewOutGame } from '../styles';
import { css } from '@emotion/core';
import { mL, mR, textXs } from '../../../styles/atoms';
import MyPreviewName from './MyPreviewName';
import { useAtomValue, useUpdateAtom } from 'jotai/utils';
import { isActionAtom, sourceAtom } from './state';
import { useCallback, useMemo } from 'react';
import { useChannelId } from '../../../hooks/useChannelId';
import { AddDiceButton } from './AddDiceButton';
import ChatImageUploadButton from './ImageUploadButton';
import WhisperTo from './WhisperTo';
import { InPreviewActionButton } from './InPreviewActionButton';
import { BroadcastAreClosed } from './BroadcastAreClosed';
import { useParse } from '../../../hooks/useParse';

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
  const enableBroadcast = preview.text !== null;
  const channelId = useChannelId();
  const source = useAtomValue(sourceAtom, channelId);
  const isAction = useAtomValue(isActionAtom, channelId);
  const parse = useParse();
  const { text, entities } = useMemo(() => parse(source), [source, parse]);

  const name = <MyPreviewName />;

  return (
    <div
      css={[chatItemContainer, previewChatItem, preview.inGame ? previewInGame : previewOutGame]}
      data-in-game={preview.inGame}
    >
      {!isAction && <div css={nameContainer}>{name}</div>}
      <ChatItemContentContainer data-action={isAction} data-in-game={preview.inGame}>
        {isAction && name}
        {!enableBroadcast && <BroadcastAreClosed css={mR(1)} />}
        {text && <ChatItemContent entities={entities} text={text} />}
        <AddDiceButton />
        <div>
          <WhisperTo />
          <InPreviewActionButton css={mL(1)} />
          <ChatImageUploadButton css={[mL(1)]} />
        </div>
      </ChatItemContentContainer>
    </div>
  );
}

export default React.memo(MyPreview);
