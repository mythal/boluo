import clsx from 'clsx';
import { type FC, useEffect, useMemo, useRef } from 'react';
import { FormattedMessage } from 'react-intl';
import { type ParseResult } from '../../interpreter/parse-result';
import { type FailTo, type MessageItem } from '../../state/channel.types';
import { MessageBox } from '@boluo/ui/chat/MessageBox';
import { MessageContentBox } from '@boluo/ui/chat/MessageContentBox';
import { MessageNamePlate } from '@boluo/ui/chat/MessageNamePlate';
import { ChatItemMessageShowWhisper } from './ChatItemMessageShowWhisper';
import { Content } from './Content';
import { MessageMedia } from './MessageMedia';
import { Name } from './Name';
import { useQueryUser } from '@boluo/common/hooks/useQueryUser';
import { messageToParsed } from '../../interpreter/to-parsed';
import { useIsScrolling } from '../../hooks/useIsScrolling';
import { useReadObserve } from '../../hooks/useReadObserve';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { type Message } from '@boluo/api';
import { type ReactNode } from 'react';
import { MessageReorderHandle } from './MessageReorderHandle';
import { MessageTime } from './MessageTime';
import { useMember } from '../../hooks/useMember';
import { Delay } from '../Delay';
import { ContentGuard } from '@boluo/ui/chat/ContentGuard';
import {
  DisplayContext as ToolbarDisplayContext,
  MessageToolbar,
  makeMessageToolbarDisplayAtom,
} from './MessageToolbar';
import { useStore } from 'jotai';
import { stopPropagation } from '@boluo/utils/browser';
import { useIsInGameChannel } from '../../hooks/useIsInGameChannel';

export const ChatItemMessage: FC<{
  message: MessageItem;
  className?: string;
  isLast: boolean;
  continuous?: boolean;
  overlay?: boolean;
}> = ({ message, continuous = false, overlay = false, isLast }) => {
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
  const parsed: ParseResult = useMemo(
    (): ParseResult => messageToParsed(message.text, message.entities),
    [message.entities, message.text],
  );
  const continued = continuous || isAction;
  const draggable = sendBySelf || iAmMaster;
  let media: ReactNode = null;
  if (message.mediaId != null) {
    media = <MessageMedia className="pt-2" media={message.mediaId} />;
  } else if (message.optimisticMedia != null) {
    media = <MessageMedia className="pt-2" media={message.optimisticMedia} />;
  }
  const shouldGuardContent =
    message.whisperToUsers != null && (parsed.text !== '' || media != null);

  return (
    <ChatMessageContainer
      sendBySelf={sendBySelf}
      inGame={message.inGame ?? false}
      message={message}
      draggable={draggable}
      overlay={overlay}
      isScrolling={isScrolling}
      continued={continued}
      pos={message.pos}
      failTo={message.failTo}
    >
      <MessageNamePlate continued={continued}>{nameNode}</MessageNamePlate>
      <MessageContentBox ref={ref} pos={message.pos} isLast={isLast}>
        {message.whisperToUsers != null && (
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
        )}

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
  isScrolling,
  sendBySelf,
  failTo,
  pos,
}) => {
  const isInGameChannel = useIsInGameChannel();
  const toolbarDisplayAtom = useMemo(() => makeMessageToolbarDisplayAtom(), []);
  const store = useStore();
  const ref = useRef<HTMLDivElement | null>(null);
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
    disabled: !draggable || isScrolling || failTo != null,
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
      <Delay>
        <MessageToolbar message={message} messageBoxRef={ref} sendBySelf={sendBySelf} />
      </Delay>
    );
  }, [isDragging, message, overlay, sendBySelf]);
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    store.set(toolbarDisplayAtom, { type: 'MORE' });
  };
  const handleContextMenu = (e: React.MouseEvent) => {
    const selection = document.getSelection();
    if (selection != null && selection.toString() !== '') return;
    e.preventDefault();
    store.set(toolbarDisplayAtom, { type: 'MORE' });
  };
  return (
    <ToolbarDisplayContext value={toolbarDisplayAtom}>
      <MessageBox
        inGame={inGame}
        pos={pos}
        continued={continued}
        lifting={overlay}
        isInGameChannel={isInGameChannel}
        isDragging={isDragging}
        style={style}
        setRef={setRef}
        handleDoubleClick={handleDoubleClick}
        handleContextMenu={handleContextMenu}
        className={className}
        timestamp={<MessageTime message={message} failTo={failTo} />}
        toolbar={toolbar}
      >
        {handle}
        {children}
      </MessageBox>
    </ToolbarDisplayContext>
  );
};
