import * as React from 'react';
import { type DraggableProvidedDragHandleProps } from '@hello-pangea/dnd';
import Handle from '@boluo/icons/legacy/Handle';
import { parseDateString } from '../../utils/helper';
import { dateTimeFormat } from '../../utils/time';
import Icon from '../atoms/Icon';

interface Props {
  timestamp: string;
  handleProps: DraggableProvidedDragHandleProps;
}

function ItemMoveHandle({ timestamp, handleProps }: Props) {
  const now = parseDateString(timestamp);
  return (
    <time
      className="text-legacy-item-move-handle flex items-stretch justify-stretch rounded-[5px] py-1 text-[0.75rem] [grid-area:handle]"
      dateTime={now.toISOString()}
      title={dateTimeFormat(now)}
    >
      <div
        className="handle hover:bg-legacy-outline-background focus:bg-legacy-transparent-900 flex items-center rounded-[5px] p-1 focus:outline-none"
        {...handleProps}
      >
        <Icon icon={Handle} />
      </div>
    </time>
  );
}

export default React.memo(ItemMoveHandle);
