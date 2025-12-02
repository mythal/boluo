import {
  type FC,
  type PointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { FormattedMessage } from 'react-intl';
import { type ParseResult, messageToParsed } from '@boluo/interpreter';
import { type FailTo, type MessageItem } from '../../state/channel.types';
import { MessageBox } from '@boluo/ui/chat/MessageBox';
import { MessageContentBox } from '@boluo/ui/chat/MessageContentBox';
import { MessageNamePlate } from '@boluo/ui/chat/MessageNamePlate';
import { ChatItemMessageShowWhisper } from './ChatItemMessageShowWhisper';
import { Content } from './Content';
import { MessageMedia } from './MessageMedia';
import { Name } from './Name';
import { useQueryUser } from '@boluo/common/hooks/useQueryUser';
import { useIsScrolling } from '../../hooks/useIsScrolling';
import { useReadObserve } from '../../hooks/useReadObserve';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { type Message } from '@boluo/api';
import { type ReactNode } from 'react';
import { MessageReorderHandle } from './MessageReorderHandle';
import { MessageTime } from './MessageTime';
import { useMember } from '../../hooks/useMember';
import { Delay } from '@boluo/ui/Delay';
import { ContentGuard } from '@boluo/ui/chat/ContentGuard';
import {
  DisplayContext as ToolbarDisplayContext,
  MessageToolbar,
  makeMessageToolbarDisplayAtom,
} from './MessageToolbar';
import { useStore } from 'jotai';
import { stopPropagation } from '@boluo/utils/browser';
import { useIsInGameChannel } from '../../hooks/useIsInGameChannel';
import { useIsDragging } from '../../hooks/useIsDragging';

const LONG_PRESS_DURATION = 300;

export const ChatItemMessage: FC<{
  message: MessageItem;
  className?: string;
  highlighted?: boolean;
  isLast: boolean;
  continuous?: boolean;
  overlay?: boolean;
}> = ({ message, continuous = false, overlay = false, isLast, highlighted = false }) => {
  const member = useMember();
  const sendBySelf = member?.user.id === message.senderId;
  const iAmMaster = member?.channel.isMaster || false;
  const isScrolling = useIsScrolling();
  const { isMaster, isAction } = message;
  const { data: user } = useQueryUser(message.senderId);
  const readObserve = useReadObserve();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current == null) return;
    return readObserve(ref.current);
  }, [readObserve]);

  const nameNode = useMemo(
    () => (
      <Name
        inGame={message.inGame ?? false}
        name={message.name}
        isMaster={isMaster ?? false}
        self={sendBySelf}
        user={user}
      />
    ),
    [message.inGame, message.name, isMaster, sendBySelf, user],
  );

  const namePlate = useMemo(() => {
    return <MessageNamePlate continued={continuous}>{nameNode}</MessageNamePlate>;
  }, [continuous, nameNode]);
  const parsed: ParseResult = useMemo(
    (): ParseResult => messageToParsed(message.text, message.entities),
    [message],
  );
  const continued = continuous || isAction;
  const draggable = sendBySelf || iAmMaster;
  const media = useMemo(() => {
    if (message.mediaId != null) {
      return <MessageMedia className="pt-2" media={message.mediaId} />;
    } else if (message.optimisticMedia != null) {
      return <MessageMedia className="pt-2" media={message.optimisticMedia} />;
    }
  }, [message.mediaId, message.optimisticMedia]);
  const shouldGuardContent =
    message.whisperToUsers != null && (parsed.text !== '' || media != null);

  const whisperIndicator = useMemo(() => {
    if (message.whisperToUsers == null) return null;
    return (
      <span className="text-text-secondary text-sm italic">
        <FormattedMessage defaultMessage="(Whisper)" />
        {parsed.text === '' && (
          <ChatItemMessageShowWhisper
            className="ml-2"
            messageId={message.id}
            userIdList={message.whisperToUsers}
            channelId={message.channelId}
          />
        )}
      </span>
    );
  }, [message, parsed]);

  const content = useMemo(() => {
    return (
      <ContentGuard active={shouldGuardContent}>
        {parsed.text !== '' && (
          <div>
            <Content
              source={parsed.text}
              entities={parsed.entities}
              isAction={isAction ?? false}
              nameNode={nameNode}
              isArchived={message.folded ?? false}
              seed={message.seed}
              onContextMenu={stopPropagation}
              onDoubleClick={stopPropagation}
            />
          </div>
        )}
        {media}
      </ContentGuard>
    );
  }, [isAction, media, message, nameNode, parsed, shouldGuardContent]);

  return (
    <ChatMessageContainer
      sendBySelf={sendBySelf}
      inGame={message.inGame ?? false}
      message={message}
      highlighted={highlighted}
      draggable={draggable}
      overlay={overlay}
      isScrolling={isScrolling}
      continued={continued}
      pos={message.pos}
      failTo={message.failTo}
    >
      {namePlate}
      <MessageContentBox ref={ref} pos={message.pos} isLast={isLast}>
        {whisperIndicator}
        {content}
      </MessageContentBox>
    </ChatMessageContainer>
  );
};

const ChatMessageContainer: FC<{
  className?: string;
  children: ReactNode;
  message: Message;
  draggable?: boolean;
  continued?: boolean;
  overlay?: boolean;
  highlighted?: boolean;
  sendBySelf: boolean;
  isScrolling: boolean;
  inGame: boolean;
  pos: number;
  failTo: FailTo | null | undefined;
}> = ({
  className = '',
  inGame,
  children,
  draggable = false,
  overlay = false,
  message,
  continued = false,
  highlighted = false,
  isScrolling,
  sendBySelf,
  failTo,
  pos,
}) => {
  const isInGameChannel = useIsInGameChannel();
  const isAnyMessageDragging = useIsDragging();
  const toolbarDisplayAtom = useMemo(() => makeMessageToolbarDisplayAtom(), []);
  const store = useStore();
  const [longPressStart, setLongPressStart] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);
  const longPressTimeoutRef = useRef<number | null>(null);
  const longPressActivatedToolbarRef = useRef(false);
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

  const setRef = (node: HTMLDivElement | null) => {
    ref.current = node;
    setNodeRef(node);
  };

  const style = useMemo(
    () => ({
      transform: CSS.Transform.toString(transform),
      transition,
    }),
    [transform, transition],
  );
  const handle = useMemo(
    () => (
      <MessageReorderHandle
        draggable={draggable}
        ref={setActivatorNodeRef}
        attributes={attributes}
        listeners={listeners}
        failTo={failTo}
      />
    ),
    [attributes, draggable, failTo, listeners, setActivatorNodeRef],
  );
  const toolbar = useMemo(() => {
    if (isDragging || overlay) return null;
    return (
      <Delay fallback={null}>
        <MessageToolbar
          message={message}
          messageBoxRef={ref}
          sendBySelf={sendBySelf}
          longPressStart={longPressStart}
          longPressDuration={LONG_PRESS_DURATION}
        />
      </Delay>
    );
  }, [isDragging, longPressStart, message, overlay, sendBySelf]);
  const clearLongPressTimeout = () => {
    if (longPressTimeoutRef.current != null) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };
  const resetLongPressState = useCallback(
    (hideToolbar = true) => {
      clearLongPressTimeout();
      if (hideToolbar && longPressActivatedToolbarRef.current) {
        store.set(toolbarDisplayAtom, { type: 'HIDDEN' });
      }
      longPressActivatedToolbarRef.current = false;
      setLongPressStart(null);
    },
    [store, toolbarDisplayAtom],
  );
  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
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
  };
  const handlePointerUp = () => {
    resetLongPressState();
  };
  const handlePointerLeave = () => {
    resetLongPressState();
  };
  const handlePointerCancel = () => {
    resetLongPressState();
  };
  useEffect(() => {
    return () => {
      clearLongPressTimeout();
    };
  }, []);
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
  const timestamp = useMemo(
    () => <MessageTime message={message} failTo={failTo} />,
    [failTo, message],
  );
  return (
    <ToolbarDisplayContext value={toolbarDisplayAtom}>
      <MessageBox
        inGame={inGame}
        pos={pos}
        continued={continued}
        highlighted={highlighted}
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
        {children}
      </MessageBox>
    </ToolbarDisplayContext>
  );
};
