import * as React from 'react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChannelMember } from '../../api/channels';
import {
  Draggable,
  DraggableProvided,
  DraggableProvidedDragHandleProps,
  DraggableStateSnapshot,
} from 'react-beautiful-dnd';
import { css } from '@emotion/core';
import { black } from '../../styles/colors';
import { EditItem, MessageItem, PreviewItem } from '../../states/chat-item-set';
import { useSelector } from '../../store';
import { usePane } from '../../hooks/usePane';
import { ChatState } from '../../reducers/chat';
import ChatPreviewCompose from './compose/EditCompose';
import ChatPreviewItem from './PreviewItem';
import ChatMessageItem from './MessageItem';
import { chatItemContainer } from './ChatItemContainer';
import { ChatItemContentContainer } from './ChatItemContentContainer';

interface Props {
  index: number;
  item: PreviewItem | MessageItem;
  myMember: ChannelMember | undefined;
  provided?: DraggableProvided;
  snapshot?: DraggableStateSnapshot;
  resizeObserver?: React.RefObject<ResizeObserver>;
  measure?: (rect: DOMRect, index: number) => void;
  filter?: ChatState['filter'];
}

const dragging = css`
  filter: brightness(200%);
  box-shadow: 1px 1px 2px ${black};
`;

const itemSwitch = (
  item: PreviewItem | MessageItem,
  editItem: EditItem | undefined,
  filter: ChatState['filter'],
  myMember?: ChannelMember,
  handleProps?: DraggableProvidedDragHandleProps
) => {
  const myId = myMember?.userId;
  const inGame = filter === 'IN_GAME';
  const outGame = filter === 'OUT_GAME';
  if (item.type === 'MESSAGE') {
    const { message } = item;
    if ((inGame && !message.inGame) || (outGame && message.inGame)) {
      return null;
    }
    if (editItem !== undefined) {
      if (editItem.mine && myId) {
        return <ChatPreviewCompose preview={editItem.preview} editTo={message} />;
      } else if (editItem.preview !== undefined) {
        return <ChatPreviewItem preview={editItem.preview} />;
      }
    }
    return (
      <ChatMessageItem
        message={message}
        mine={item.mine}
        myMember={myMember}
        handleProps={handleProps}
        moving={item.moving}
      />
    );
  } else {
    // preview
    if ((inGame && !item.preview.inGame) || (outGame && item.preview.inGame)) {
      return null;
    } else {
      return <ChatPreviewItem key={item.id} preview={item.preview} />;
    }
  }
};

function VirtualItem({ index, item, myMember, provided, snapshot, resizeObserver, measure, filter = 'NONE' }: Props) {
  const itemIndex = index - 1;
  const [deferred, setDefer] = useState<number>(() => {
    const timeout = Math.random() * 300;
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

  useLayoutEffect(() => {
    if (wrapper.current === null) {
      return;
    }
    if (measure) {
      measure(wrapper.current.getBoundingClientRect(), index);
    }
    resizeObserver?.current?.observe(wrapper.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferred, wrapper.current, index, resizeObserver]);

  const draggable = item?.type === 'MESSAGE' && (item.mine || myMember?.isMaster);
  const id = item?.id || myMember?.userId || 'UNEXPECTED';
  const renderer = (provided: DraggableProvided, snapshot?: DraggableStateSnapshot) => {
    const style = snapshot?.isDragging ? dragging : {};
    return (
      <div ref={wrapper} data-index={index}>
        <div ref={provided.innerRef} {...provided.draggableProps} css={style}>
          {deferred <= 0 ? (
            itemSwitch(item, editItem, filter, myMember, provided.dragHandleProps)
          ) : item.type === 'PREVIEW' ? (
            <div css={chatItemContainer} data-in-game={item.preview.inGame}>
              <ChatItemContentContainer data-in-game={item.preview.inGame}>
                {item.preview.text}
              </ChatItemContentContainer>
            </div>
          ) : (
            <div css={chatItemContainer} data-in-game={item.message.inGame}>
              <ChatItemContentContainer data-in-game={item.message.inGame}>
                {item.message.text}
              </ChatItemContentContainer>
            </div>
          )}
        </div>
      </div>
    );
  };
  if (provided) {
    return renderer(provided, snapshot);
  }
  return (
    <Draggable draggableId={id} index={itemIndex} isDragDisabled={!draggable || deferred > 0}>
      {renderer}
    </Draggable>
  );
}

export default React.memo(VirtualItem);
