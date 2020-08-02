import * as React from 'react';
import { Preview } from '@/api/events';
import { ChatItemContainer } from '@/components/atoms/ChatItemContainer';
import ChatItemTime from '@/components/atoms/ChatItemTime';
import ChatItemName from '@/components/atoms/ChatItemName';
import { previewStyle } from '@/styles/atoms';
import ChatItemContent from '@/components/atoms/ChatItemContent';

interface Props {
  preview: Preview;
}

function ChatPreviewItem({ preview }: Props) {
  let { text, isAction } = preview;

  if (text === '') {
    return null;
  }
  if (text === null) {
    text = '输入中…';
    isAction = true;
  }

  return (
    <ChatItemContainer css={[previewStyle]}>
      <ChatItemTime timestamp={preview.start} />
      <ChatItemName master={preview.isMaster} name={preview.name} userId={preview.senderId} />
      <ChatItemContent action={isAction} text={text} />
    </ChatItemContainer>
  );
}

export default React.memo(ChatPreviewItem);
