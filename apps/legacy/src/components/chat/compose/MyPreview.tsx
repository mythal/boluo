import * as React from 'react';
import { useMemo } from 'react';
import { type Preview } from '../../../api/events';
import { useChannelId } from '../../../hooks/useChannelId';
import { useParse } from '../../../hooks/useParse';
import { useSelector } from '../../../store';
import { ChatItemContentContainer } from '../ChatItemContentContainer';
import ChatItemContent from '../ItemContent';
import { chatItemContainerClassName, chatItemNameContainerClassName } from '../classNames';
import { AddDiceButton } from './AddDiceButton';
import { BroadcastAreClosed } from './BroadcastAreClosed';
import ChatImageUploadButton from './ImageUploadButton';
import { InPreviewActionButton } from './InPreviewActionButton';
import MyPreviewName from './MyPreviewName';
import WhisperTo from './WhisperTo';

interface Props {
  preview: Preview;
}

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
      className={`${chatItemContainerClassName} legacy-chat-preview ${
        preview.inGame ? 'legacy-chat-preview-in-game' : 'legacy-chat-preview-out-game'
      }`}
      data-in-game={preview.inGame ?? false}
    >
      {!isAction && <div className={chatItemNameContainerClassName}>{name}</div>}
      <ChatItemContentContainer data-action={isAction} data-in-game={preview.inGame ?? false}>
        {isAction && name}
        {!enableBroadcast && <BroadcastAreClosed className="mr-1" />}
        {text && <ChatItemContent entities={entities} text={text} />}
        <AddDiceButton />
        <div>
          <WhisperTo />
          <InPreviewActionButton className="ml-1" />
          <ChatImageUploadButton className="ml-1" />
        </div>
      </ChatItemContentContainer>
    </div>
  );
}

export default React.memo(MyPreview);
