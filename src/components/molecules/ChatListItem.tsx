import * as React from 'react';
import { useEffect, useRef } from 'react';
import { useSelector } from '../../store';
import { Draggable, DraggableProvided } from 'react-beautiful-dnd';
import ItemSwitch from './ItemSwitch';
import { css } from '@emotion/core';
import { black } from '../../styles/colors';

interface Props {
  itemIndex: number;
  measure?: (rect: DOMRect, index: number) => void;
  provided?: DraggableProvided;
  float?: boolean;
  isDragging?: boolean;
}

const dragging = css`
  filter: brightness(200%);
  box-shadow: 1px 1px 2px ${black};
`;

function ChatListItem({ itemIndex, measure, provided, float = false, isDragging = false }: Props) {
  const item = useSelector((state) => state.chat!.itemSet.messages.get(itemIndex));
  const myMember = useSelector((state) => {
    if (state.profile === undefined || state.chat === undefined) {
      return undefined;
    } else {
      return state.profile.channels.get(state.chat!.channel.id)?.member;
    }
  });
  const myId = myMember?.userId;
  const editItem = useSelector((state) => {
    if (item !== undefined && item.type === 'MESSAGE') {
      return state.chat!.itemSet.editions.get(item.message.id);
    } else {
      return undefined;
    }
  });
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (containerRef.current && measure) {
      measure(containerRef.current.getBoundingClientRect(), itemIndex + 1 /* load more button */);
    }
  });
  if (float) {
    return (
      <div ref={containerRef}>
        <ItemSwitch item={item} myId={myId} />
      </div>
    );
  }
  const isDraggable =
    item &&
    item.type === 'MESSAGE' &&
    myId !== undefined &&
    editItem === undefined &&
    (item.mine || myMember?.isMaster);
  const renderer = (provided: DraggableProvided) => {
    return (
      <div ref={provided.innerRef} {...provided.draggableProps}>
        <div ref={containerRef} css={isDragging ? dragging : undefined}>
          <ItemSwitch myId={myId} item={item} editItem={editItem} handleProps={provided.dragHandleProps} />
        </div>
      </div>
    );
  };
  if (provided) {
    return renderer(provided);
  }
  const id = item?.id || myId || '';
  // https://github.com/atlassian/react-beautiful-dnd/issues/1767#issuecomment-670680418
  return (
    <Draggable key={id} draggableId={id} index={itemIndex} isDragDisabled={!isDraggable}>
      {renderer}
    </Draggable>
  );
}

export default ChatListItem;
