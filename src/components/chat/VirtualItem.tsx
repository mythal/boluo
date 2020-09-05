import * as React from 'react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChannelMember } from '../../api/channels';
import { Draggable, DraggableProvided, DraggableStateSnapshot } from 'react-beautiful-dnd';
import ItemSwitch from './ItemSwitch';
import { css } from '@emotion/core';
import { black } from '../../styles/colors';
import { MessageItem, PreviewItem } from '../../states/chat-item-set';
import { useSelector } from '../../store';
import { usePane } from '../../hooks/usePane';

interface Props {
  index: number;
  item: PreviewItem | MessageItem;
  myMember: ChannelMember | undefined;
  provided?: DraggableProvided;
  snapshot?: DraggableStateSnapshot;
  measure?: (rect: DOMRect, index: number) => void;
}

const dragging = css`
  filter: brightness(200%);
  box-shadow: 1px 1px 2px ${black};
`;

function VirtualItem({ index, item, myMember, provided, snapshot, measure }: Props) {
  const itemIndex = index - 1;
  const [deferred, setDefer] = useState<number>(() => {
    const timeout = Math.random() * 160;
    return timeout < 20 ? 0 : Math.floor(timeout) - 20;
  });
  const pane = usePane();
  const wrapper = useRef<HTMLDivElement>(null);
  const editItem = useSelector((state) => {
    if (item !== undefined && item.type === 'MESSAGE') {
      const editItem = state.chatPane[pane]!.itemSet.editions.get(item.message.id);
      if (
        editItem !== undefined &&
        (editItem.preview === undefined || editItem.preview.editFor === item.message.modified)
      ) {
        return editItem;
      } else {
        return undefined;
      }
    } else {
      return undefined;
    }
  });

  useEffect(() => {
    if (deferred === 0) {
      return;
    }
    const handle = window.setTimeout(() => {
      setDefer(0);
    }, deferred);
    return () => window.clearTimeout(handle);
  }, [deferred]);

  const itemMeasure = useCallback(() => {
    if (wrapper.current && measure) {
      const rect = wrapper.current.getBoundingClientRect();
      if (rect.height > 0) {
        measure(rect, index);
      }
    }
  }, [measure, index]);
  useLayoutEffect(() => {
    itemMeasure();
  });
  if (deferred > 0) {
    return <div ref={wrapper} />;
  }

  const draggable = item?.type === 'MESSAGE' && (item.mine || myMember?.isMaster) && !editItem;
  const id = item?.id || myMember?.userId || 'UNEXPECTED';
  const renderer = (provided: DraggableProvided, snapshot?: DraggableStateSnapshot) => {
    const style = snapshot?.isDragging ? dragging : {};
    return (
      <div ref={wrapper}>
        <div ref={provided.innerRef} {...provided.draggableProps} css={style}>
          <ItemSwitch
            measure={itemMeasure}
            item={item}
            editItem={editItem}
            myMember={myMember}
            handleProps={provided.dragHandleProps}
          />
        </div>
      </div>
    );
  };
  if (provided) {
    return renderer(provided, snapshot);
  }
  return (
    <Draggable draggableId={id} index={itemIndex} isDragDisabled={!draggable}>
      {renderer}
    </Draggable>
  );
}

export default React.memo(VirtualItem);
