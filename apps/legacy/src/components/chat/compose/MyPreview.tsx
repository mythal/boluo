import { css } from '@emotion/react';
import * as React from 'react';
import { useMemo } from 'react';
import { type Preview } from '../../../api/events';
import { useChannelId } from '../../../hooks/useChannelId';
import { useParse } from '../../../hooks/useParse';
import { useSelector } from '../../../store';
import { mL, mR, textXs } from '../../../styles/atoms';
import { chatItemContainer } from '../ChatItemContainer';
import { ChatItemContentContainer } from '../ChatItemContentContainer';
import ChatItemContent from '../ItemContent';
import { nameContainer, previewInGame, previewOutGame } from '../styles';
import { AddDiceButton } from './AddDiceButton';
import { BroadcastAreClosed } from './BroadcastAreClosed';
import ChatImageUploadButton from './ImageUploadButton';
import { InPreviewActionButton } from './InPreviewActionButton';
import MyPreviewName from './MyPreviewName';
import WhisperTo from './WhisperTo';

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
  const enableBroadcast = preview.text != null;
  const channelId = useChannelId();
  const source = useSelector((state) => state.chatStates.get(channelId)!.compose.source);
  const isAction = useSelector((state) => state.chatStates.get(channelId)!.compose.isAction);
  const parse = useParse();
  const { text, entities } = useMemo(() => parse(source), [source, parse]);

  const name = <MyPreviewName />;

  return (
    <div
      css={[chatItemContainer, previewChatItem, preview.inGame ? previewInGame : previewOutGame]}
      data-in-game={preview.inGame ?? false}
    >
      {!isAction && <div css={nameContainer}>{name}</div>}
      <ChatItemContentContainer data-action={isAction} data-in-game={preview.inGame ?? false}>
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
