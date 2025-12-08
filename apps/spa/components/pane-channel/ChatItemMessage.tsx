import {
  type FC,
  memo,
  type PointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { type ParseResult, messageToParsed } from '@boluo/interpreter';
import { type MessageItem } from '../../state/channel.types';
import { MessageBox } from '@boluo/ui/chat/MessageBox';
import { MessageContentBox } from '@boluo/ui/chat/MessageContentBox';
import { MessageNamePlate } from '@boluo/ui/chat/MessageNamePlate';
import { ChatItemMessageWhisperIndicator } from './ChatItemMessageWhisperIndicator';
import { Name } from './Name';
import { useReadObserve } from '../../hooks/useReadObserve';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MessageReorderHandle } from './MessageReorderHandle';
import { MessageTime } from './MessageTime';
import { ChatItemMessageContent } from './ChatItemMessageContent';
import { Delay } from '@boluo/ui/Delay';
import {
  DisplayContext as ToolbarDisplayContext,
  MessageToolbar,
  makeMessageToolbarDisplayAtom,
} from './MessageToolbar';
import { useAtomValue, useStore } from 'jotai';
import { useMember } from '../../hooks/useMember';
import { useIsInGameChannel } from '../../hooks/useIsInGameChannel';
import { useIsDragging } from '../../hooks/useIsDragging';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { selectAtom } from 'jotai/utils';

const LONG_PRESS_DURATION = 300;

const useMessageLongPress = (
  toolbarDisplayAtom: ReturnType<typeof makeMessageToolbarDisplayAtom>,
  store: ReturnType<typeof useStore>,
) => {
  const [longPressStart, setLongPressStart] = useState<number | null>(null);
  const longPressTimeoutRef = useRef<number | null>(null);
  const longPressActivatedToolbarRef = useRef(false);

  const clearLongPressTimeout = useCallback(() => {
    if (longPressTimeoutRef.current != null) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  }, []);

  const resetLongPressState = useCallback(
    (hideToolbar = true) => {
      clearLongPressTimeout();
      if (hideToolbar && longPressActivatedToolbarRef.current) {
        store.set(toolbarDisplayAtom, { type: 'HIDDEN' });
      }
      longPressActivatedToolbarRef.current = false;
      setLongPressStart(null);
    },
    [clearLongPressTimeout, store, toolbarDisplayAtom],
  );

  const handlePointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (document.getSelection()?.toString()) return;
      if (e.target instanceof Element) {
        if (e.target.closest('.MessageToolbar') || e.target.closest('.MessageHandleBox')) {
          return;
        }
      }
      const currentDisplay = store.get(toolbarDisplayAtom);
      if (currentDisplay.type === 'HIDDEN') {
        store.set(toolbarDisplayAtom, { type: 'SHOW' });
        longPressActivatedToolbarRef.current = true;
      } else {
        longPressActivatedToolbarRef.current = false;
      }
      const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
      setLongPressStart(start);
      clearLongPressTimeout();
      longPressTimeoutRef.current = window.setTimeout(() => {
        longPressTimeoutRef.current = null;
        longPressActivatedToolbarRef.current = false;
        setLongPressStart(null);
        store.set(toolbarDisplayAtom, { type: 'MORE' });
      }, LONG_PRESS_DURATION);
    },
    [clearLongPressTimeout, store, toolbarDisplayAtom],
  );

  const handlePointerUp = useCallback(() => {
    resetLongPressState();
  }, [resetLongPressState]);
  const handlePointerLeave = useCallback(() => {
    resetLongPressState();
  }, [resetLongPressState]);
  const handlePointerCancel = useCallback(() => {
    resetLongPressState();
  }, [resetLongPressState]);

  useEffect(() => {
    return () => {
      clearLongPressTimeout();
    };
  }, [clearLongPressTimeout]);

  useEffect(() => {
    if (longPressStart == null) return;
    if (typeof document === 'undefined') return;
    const handleSelectionChange = () => {
      const selection = document.getSelection();
      if (selection != null && selection.toString() !== '') {
        resetLongPressState();
      }
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [longPressStart, resetLongPressState]);

  return {
    longPressStart,
    handlePointerDown,
    handlePointerUp,
    handlePointerLeave,
    handlePointerCancel,
  };
};

interface Props {
  message: MessageItem;
  className?: string;
  isLast: boolean;
  continuous?: boolean;
  overlay?: boolean;
}

const ChatItemMessageComponent: FC<Props> = ({
  message,
  className = '',
  continuous = false,
  overlay = false,
  isLast,
}) => {
  const { highlightMessageAtom } = useChannelAtoms();
  const isHighlightedAtom = useMemo(
    () => selectAtom(highlightMessageAtom, (id) => id === message.id),
    [highlightMessageAtom, message.id],
  );
  const isHighlighted = useAtomValue(isHighlightedAtom);

  const member = useMember();
  const sendBySelf = member?.user.id === message.senderId;
  const iAmMaster = member?.channel.isMaster || false;
  const { isMaster, isAction, failTo } = message;
  const readObserve = useReadObserve();
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (overlay) return;
    if (contentRef.current == null) return;
    return readObserve(contentRef.current);
  }, [overlay, readObserve]);
  const isInGameChannel = useIsInGameChannel();
  const isAnyMessageDragging = useIsDragging();
  const toolbarDisplayAtom = useMemo(() => makeMessageToolbarDisplayAtom(), []);
  const store = useStore();
  const messageBoxRef = useRef<HTMLDivElement | null>(null);
  const {
    longPressStart,
    handlePointerDown,
    handlePointerUp,
    handlePointerLeave,
    handlePointerCancel,
  } = useMessageLongPress(toolbarDisplayAtom, store);

  const nameNode = useMemo(
    () => (
      <Name
        inGame={message.inGame ?? false}
        name={message.name}
        isMaster={isMaster ?? false}
        self={sendBySelf}
        userId={message.senderId}
      />
    ),
    [message.inGame, message.name, isMaster, sendBySelf, message.senderId],
  );

  const parsed: ParseResult = useMemo(
    (): ParseResult => messageToParsed(message.text, message.entities),
    [message.entities, message.text],
  );
  const shouldConcealNameOnLeft = continuous || isAction;

  const namePlate = useMemo(() => {
    return (
      <MessageNamePlate shouldConcealNameOnLeft={shouldConcealNameOnLeft}>
        {nameNode}
      </MessageNamePlate>
    );
  }, [shouldConcealNameOnLeft, nameNode]);
  const draggable = sendBySelf || iAmMaster;
  const content = useMemo(() => {
    return <ChatItemMessageContent message={message} parsed={parsed} nameNode={nameNode} />;
  }, [message, nameNode, parsed]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    setActivatorNodeRef,
  } = useSortable({
    id: message.id,
    data: { message },
    disabled: !draggable || failTo != null,
  });

  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      messageBoxRef.current = node;
      setNodeRef(node);
    },
    [setNodeRef],
  );

  const style = useMemo(
    () => ({
      transform: transform ? CSS.Transform.toString(transform) : undefined,
      transition,
    }),
    [transform, transition],
  );
  const timestamp = useMemo(
    () => <MessageTime message={message} failTo={failTo} />,
    [failTo, message],
  );
  const handle = useMemo(
    () => (
      <MessageReorderHandle
        draggable={draggable}
        lifting={overlay}
        ref={setActivatorNodeRef}
        attributes={attributes}
        listeners={listeners}
        timestamp={timestamp}
        failTo={failTo}
      />
    ),
    [attributes, draggable, failTo, listeners, overlay, setActivatorNodeRef, timestamp],
  );
  const toolbar = useMemo(() => {
    if (isDragging || overlay) return null;
    return (
      <Delay fallback={null}>
        <MessageToolbar
          message={message}
          messageBoxRef={messageBoxRef}
          sendBySelf={sendBySelf}
          longPressStart={longPressStart}
          longPressDuration={LONG_PRESS_DURATION}
        />
      </Delay>
    );
  }, [isDragging, longPressStart, message, overlay, sendBySelf]);
  return (
    <ToolbarDisplayContext value={toolbarDisplayAtom}>
      <MessageBox
        inGame={message.inGame ?? false}
        pos={message.pos}
        continued={shouldConcealNameOnLeft}
        highlighted={isHighlighted}
        lifting={overlay}
        isInGameChannel={isInGameChannel}
        isDragging={isDragging}
        disableHoverEffect={isAnyMessageDragging}
        style={style}
        setRef={setRef}
        handlePointerDown={handlePointerDown}
        handlePointerUp={handlePointerUp}
        handlePointerLeave={handlePointerLeave}
        handlePointerCancel={handlePointerCancel}
        className={className}
        timestamp={timestamp}
        toolbar={toolbar}
      >
        {handle}
        {namePlate}
        <MessageContentBox ref={contentRef} pos={message.pos} isLast={isLast}>
          <ChatItemMessageWhisperIndicator message={message} parsed={parsed} />
          {content}
        </MessageContentBox>
      </MessageBox>
    </ToolbarDisplayContext>
  );
};

export const ChatItemMessage = memo(ChatItemMessageComponent);
ChatItemMessage.displayName = 'ChatItemMessage';
