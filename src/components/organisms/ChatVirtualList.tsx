import * as React from 'react';
import { useRef } from 'react';
import { useSelector } from '../../store';
import { useVirtual } from '../../hooks/useVirtual';
import { css } from '@emotion/core';
import { bgColor } from '../../styles/colors';
import { loadMoreHeight } from '../molecules/LoadMore';
import { Id, newId } from '../../utils/id';
import { DraggableProvided, DraggableRubric, DraggableStateSnapshot, Droppable } from 'react-beautiful-dnd';
import { ChannelMember } from '../../api/channels';
import { ChatVirtualListItem } from '../molecules/ChatVirtualListItem';
import ChatDraggableItem from '../molecules/ChatDraggableItem';
import { PreviewItem } from '../../states/chat-item-set';
import { Preview } from '../../api/events';

interface Props {
  channelId: Id;
  myMember: ChannelMember | undefined;
}

const container = css`
  grid-area: list;
  background-color: ${bgColor};
  overflow-y: scroll;
  overflow-x: hidden;
`;

function estimateSize(index: number): number {
  if (index === 0) {
    return loadMoreHeight;
  } else {
    return 45;
  }
}

const dummyPreview = (member: ChannelMember): PreviewItem => {
  const date = new Date().getTime();
  const offset = 42;
  const mine = true;
  const id = newId();
  const preview: Preview = {
    id,
    senderId: member.userId,
    mailbox: member.channelId,
    mailboxType: 'CHANNEL',
    parentMessageId: null,
    name: member.characterName,
    inGame: true,
    isAction: false,
    isMaster: member.isMaster,
    mediaId: null,
    text: '',
    whisperToUsers: null,
    entities: [],
    start: date,
    editFor: null,
  };
  return { type: 'PREVIEW', preview, id: member.userId, date, mine, offset };
};

function ChatVirtualList({ myMember, channelId }: Props) {
  const myPreview = useSelector((state) => {
    return myMember === undefined ? undefined : state.chat!.itemSet.previews.get(myMember.userId);
  });
  let messages = useSelector((state) => state.chat!.itemSet.messages);
  if (myMember !== undefined && myPreview === undefined) {
    messages = messages.push(dummyPreview(myMember));
  }
  const listSize = messages.size + 1; // + 1 for "load more" button
  const parentRef = useRef<HTMLDivElement>(null);
  const {
    start: rangeStart,
    end: rangeEnd,
    viewportStart,
    viewportEnd,
    totalSize,
    virtualItems,
    measure,
    cacheShift,
  } = useVirtual({
    size: listSize,
    parentRef,
    estimateSize,
    renderThreshold: 0,
    overscan: 16,
  });

  const sizeRecord = useRef<Record<string, DOMRect>>({});
  const submitSizeChange = useRef<number | undefined>(undefined);

  const resizeObserver = useRef<ResizeObserver>(
    new ResizeObserver((entries) => {
      for (const entry of entries) {
        const index: string | null = entry.target.getAttribute('data-index');
        if (index !== null) {
          sizeRecord.current[index] = entry.contentRect;
          window.clearTimeout(submitSizeChange.current);
          submitSizeChange.current = window.setTimeout(() => {
            for (const [index, rect] of Object.entries(sizeRecord.current)) {
              measure(rect, parseInt(index));
            }
          }, 100);
        }
      }
    })
  );

  const items = virtualItems.map(({ index, size, start, end }) => {
    const item = index === 0 ? undefined : messages.get(index - 1);
    return (
      <ChatVirtualListItem
        myMember={myMember}
        key={item?.id || index}
        item={item}
        index={index}
        size={size}
        end={end}
        start={start}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        viewportStart={viewportStart}
        viewportEnd={viewportEnd}
        resizeObserverRef={resizeObserver}
        measure={measure}
        shift={cacheShift}
      />
    );
  });
  return (
    <div css={container} ref={parentRef}>
      <Droppable
        droppableId={channelId}
        type="CHANNEL"
        mode="virtual"
        renderClone={(provided: DraggableProvided, snapshot: DraggableStateSnapshot, rubric: DraggableRubric) => {
          const index = rubric.source.index;
          const item = messages.get(index);
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

export default React.memo(ChatVirtualList);
