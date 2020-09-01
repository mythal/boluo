import * as React from 'react';
import { useRef } from 'react';
import { useDispatch, useSelector } from '../../store';
import { useVirtual } from '../../hooks/useVirtual';
import { css } from '@emotion/core';
import { bgColor, blue, gray } from '../../styles/colors';
import LoadMore, { loadMoreHeight } from './LoadMore';
import { Id } from '../../utils/id';
import { DraggableProvided, DraggableRubric, DraggableStateSnapshot, Droppable } from 'react-beautiful-dnd';
import { ChannelMember } from '../../api/channels';
import ChatDraggableItem from './VirtualItem';
import { usePane } from '../../hooks/usePane';
import { useHistory } from 'react-router-dom';
import { chatPath } from '../../utils/path';

interface Props {
  channelId: Id;
  myMember: ChannelMember | undefined;
}

const container = css`
  grid-row: list-start / list-end;
  background-color: ${bgColor};
  overflow-y: scroll;
  overflow-x: hidden;
  // scrollbar-width: none; /* Firefox */
  // &::-webkit-scrollbar {
  //   display: none; /* Safari and Chrome */
  // }

  border: 1px solid ${gray['900']};

  &[data-active='true'] {
    border-color: ${blue['700']};
  }
`;

function estimateSize(index: number): number {
  if (index === 0) {
    return loadMoreHeight;
  } else {
    return 42;
  }
}

function VirtualList({ myMember, channelId }: Props) {
  const pane = usePane();
  const dispatch = useDispatch();
  const history = useHistory();
  const spaceId = useSelector((state) => state.chatPane[pane]!.channel.spaceId);
  const activePane = useSelector((state) => pane === state.activePane);
  const messages = useSelector((state) => state.chatPane[pane]!.itemSet.messages);

  const listSize = messages.size + 1; // + 1 for "load more" button
  const parentRef = useRef<HTMLDivElement>(null);
  const { totalSize, virtualItems, measure, cacheShift } = useVirtual({
    size: listSize,
    parentRef,
    estimateSize,
    paddingEnd: 24,
    renderThreshold: 0,
    overscan: 10,
  });

  const items = virtualItems.map(({ index, size, end }) => {
    const style: React.CSSProperties = {
      height: size,
      position: 'absolute',
      bottom: 0,
      left: 0,
      width: '100%',
      transform: `translateY(-${end}px)`,
    };

    if (index === 0) {
      return (
        <div key="load-more" style={style}>
          <LoadMore shift={cacheShift} />
        </div>
      );
    }

    const item = messages.get(index - 1)!;
    return (
      <div key={item.id} style={style}>
        <ChatDraggableItem item={item} myMember={myMember} index={index} measure={measure} />
      </div>
    );
  });
  const setActive = () => {
    if (!activePane) {
      dispatch({ type: 'SWITCH_ACTIVE_PANE', pane });
      history.replace(chatPath(spaceId, channelId));
    }
  };
  return (
    <div css={container} ref={parentRef} data-active={activePane} onClick={setActive}>
      <Droppable
        droppableId={channelId}
        type="CHANNEL"
        mode="virtual"
        renderClone={(provided: DraggableProvided, snapshot: DraggableStateSnapshot, rubric: DraggableRubric) => {
          const index = rubric.source.index;
          const item = messages.get(index)!;
          return (
            <ChatDraggableItem
              index={index + 1}
              item={item}
              myMember={myMember}
              provided={provided}
              snapshot={snapshot}
            />
          );
        }}
      >
        {(provided) => (
          <div
            ref={provided.innerRef}
            style={{
              height: `${totalSize}px`,
              width: '100%',
              position: 'relative',
            }}
            {...provided.droppableProps}
          >
            {items}
          </div>
        )}
      </Droppable>
    </div>
  );
}

export default React.memo(VirtualList);
