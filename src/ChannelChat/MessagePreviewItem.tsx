import React from 'react';
import { ColorList } from '../api/channels';
import { Preview } from '../api/messages';
import { MessageContent } from './MessageContent';

interface Props {
  preview: Preview;
  colorList: ColorList;
}

export const MessagePreviewItem: React.FC<Props> = ({ preview, colorList }) => {
  const color = colorList[preview.senderId] ?? undefined;
  return (
    <div style={{ color }}>
      <div>{preview.name}</div>
      <MessageContent text={preview.text} entities={preview.entities} />
    </div>
  );
};
