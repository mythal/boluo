import React, { useEffect, useState } from 'react';
import { ColorList } from '../api/channels';
import { Preview } from '../api/messages';
import { ShowMessageLike } from './ShowMessageLike';

interface Props {
  preview: Preview;
  colorList: ColorList;
}

export const MessagePreviewItem: React.FC<Props> = ({ preview, colorList }) => {
  const color = colorList[preview.senderId] ?? undefined;
  const [hide, setHide] = useState(false);
  useEffect(() => {
    if (hide) {
      setHide(false);
    }
    const timeout = window.setTimeout(() => setHide(true), 5000);
    return () => window.clearTimeout(timeout);
  }, [preview]);
  if (hide) {
    return null;
  }
  return (
    <ShowMessageLike
      isAction={preview.isAction}
      isMaster={preview.isMaster}
      inGame={preview.inGame}
      name={preview.name}
      text={preview.text}
      entities={preview.entities}
      isPreview={true}
      color={color}
    />
  );
};
