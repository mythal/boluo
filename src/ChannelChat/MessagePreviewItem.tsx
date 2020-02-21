import React, { useEffect, useState } from 'react';
import { ColorList } from '../api/channels';
import { Preview } from '../api/messages';
import { ShowMessageLike } from './ShowMessageLike';
import { classNames } from '../classname';

interface Props {
  preview: Preview;
  colorList: ColorList;
}

export const MessagePreviewItem: React.FC<Props> = ({ preview, colorList }) => {
  const color = colorList[preview.senderId] ?? undefined;
  const [startHide, setStartHide] = useState(false);
  const [hide, setHide] = useState(false);
  useEffect(() => {
    if (hide) {
      setHide(false);
    }
    if (startHide) {
      setStartHide(false);
    }
    const startHideTimeout = window.setTimeout(() => setStartHide(true), 500);
    const hideTimeout = window.setTimeout(() => setHide(true), 8000);
    return () => {
      window.clearTimeout(startHideTimeout);
      window.clearTimeout(hideTimeout);
    };
  }, [preview]);
  return (
    <div className={classNames(startHide ? 'duration-8000 ease-in opacity-0' : 'duration-300', { hidden: hide })}>
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
    </div>
  );
};
