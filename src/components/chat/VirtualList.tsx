import * as React from 'react';
import { useMemo, useRef } from 'react';
import { useDispatch, useSelector } from '../../store';
import { useVirtual } from '../../hooks/useVirtual';
import { css } from '@emotion/core';
import { bgColor, blue, gray } from '../../styles/colors';
import LoadMore, { loadMoreHeight } from './LoadMore';
import { Id } from '../../utils/id';
import { DraggableProvided, DraggableRubric, DraggableStateSnapshot, Droppable } from 'react-beautiful-dnd';
import { ChannelMember } from '../../api/channels';
import VirtualItem from './VirtualItem';
import { usePane } from '../../hooks/usePane';
import { useHistory } from 'react-router-dom';
import { chatPath } from '../../utils/path';
import { ResizeObserver as Polyfill } from '@juggle/resize-observer/lib/ResizeObserver';
import { ChatState } from '../../reducers/chat';
import { MessageItem, PreviewItem } from '../../states/chat-item-set';

const ResizeObserver = window.ResizeObserver || Polyfill;

interface Props {
  channelId: Id;
  myMember: ChannelMember | undefined;
}

const container = css`
  grid-row: list-start / list-end;
  background-color: ${bgColor};
  overflow-y: scroll;
  overflow-x: hidden;
  scrollbar-width: none; /* Firefox */
  &::-webkit-scrollbar {
    display: none; /* Safari and Chrome */
  }

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

const filterMessages = (filter: ChatState['filter'], showFolded: boolean) => (
  item: PreviewItem | MessageItem
): boolean => {
  const inGame = filter === 'IN_GAME';
  const outGame = filter === 'OUT_GAME';
  if (item.type === 'MESSAGE') {
    const { message } = item;
    if (inGame && !message.inGame) {
      return false;
    }
    if (outGame && message.inGame) {
      return false;
    }
    if (message.folded && !showFolded) {
      return false;
    }
  } else if (item.type === 'PREVIEW') {
    const { preview } = item;
    if (inGame && !preview.inGame) {
      return false;
    }
    if (outGame && preview.inGame) {
      return false;
    }
  }
  return true;
};

function VirtualList({ myMember, channelId }: Props) {
  const pane = usePane();
  const dispatch = useDispatch();
  const history = useHistory();
  const spaceId = useSelector((state) => state.chatPane[pane]!.channel.spaceId);
  const activePane = useSelector((state) => pane === state.activePane);
  const messages = useSelector((state) => state.chatPane[pane]!.itemSet.messages);
  const filter = useSelector((state) => state.chatPane[pane]!.filter);
  const showFolded = useSelector((state) => state.chatPane[pane]!.showFolded);
  const filteredMessages = useMemo(() => {
    const show = filterMessages(filter, showFolded);
    return messages.filter(show);
  }, [messages, filter, showFolded]);

  const listSize = filteredMessages.size + 1; // + 1 for "load more" button
  const parentRef = useRef<HTMLDivElement>(null);
  const { totalSize, virtualItems, measure, cacheShift } = useVirtual({
    size: listSize,
    parentRef,
    estimateSize,
    renderThreshold: 0,
    overscan: 10,
  });

  const submitTimeOut = useRef<number | undefined>(undefined);
  const sizeRecord = useRef<Record<string, DOMRect>>({});
  const resizeObserver = useRef(
    new ResizeObserver((entries) => {
      window.clearTimeout(submitTimeOut.current);
      for (const entry of entries) {
        const indexAttr = entry.target.getAttribute('data-index');
        if (entry.contentRect.height === 0 || indexAttr === null) {
          continue;
        }
        sizeRecord.current[indexAttr] = entry.contentRect;
      }
      submitTimeOut.current = window.setTimeout(() => {
        for (const [indexAttr, rect] of Object.entries(sizeRecord.current)) {
          measure(rect, parseInt(indexAttr));
        }
        sizeRecord.current = {};
      }, 10);
    })
  );
  let prevSenderId: Id | null = null;
  let prevMessageName: string | null = null;
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

    const item = filteredMessages.get(index - 1)!;
    let sameSender = false;
    if (item.type === 'MESSAGE') {
      const { senderId, name } = item.message;
      if (senderId === prevSenderId && name === prevMessageName) {
        sameSender = true;
      } else {
        prevMessageName = name;
        prevSenderId = senderId;
      }
    } else {
      prevMessageName = null;
      prevSenderId = null;
    }
    return (
      <div key={item.id} style={style}>
        <VirtualItem
          item={item}
          myMember={myMember}
          index={index}
          resizeObserver={resizeObserver}
          measure={measure}
          sameSender={sameSender}
        />
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
          const item = filteredMessages.get(index)!;
          return (
            <VirtualItem index={index + 1} item={item} myMember={myMember} provided={provided} snapshot={snapshot} />
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
