import clsx from 'clsx';
import { FC, useEffect, useMemo, useRef } from 'react';
import { FormattedMessage } from 'react-intl';
import { ParseResult } from '../../interpreter/parse-result';
import { MessageItem } from '../../state/channel.types';
import { ChatItemMessageShowWhisper } from './ChatItemMessageShowWhisper';
import { Content } from './Content';
import { MessageMedia } from './MessageMedia';
import { Name } from './Name';
import { useQueryUser } from '@boluo/common';
import { messageToParsed } from '../../interpreter/to-parsed';
import { useIsScrolling } from '../../hooks/useIsScrolling';
import { useReadObserve } from '../../hooks/useReadObserve';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Message } from '@boluo/api';
import { ReactNode } from 'react';
import { MessageReorderHandle } from './MessageReorderHandle';
import { MessageTime } from './MessageTime';
import { useMember } from '../../hooks/useMember';
import { Delay } from '../Delay';
import {
  DisplayContext as ToolbarDisplayContext,
  MessageToolbar,
  makeMessageToolbarDisplayAtom,
} from './MessageToolbar';
import { useStore } from 'jotai';
import { stopPropagation } from '@boluo/utils';

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
  const { isMaster, isAction, optimistic } = message;
  const { data: user } = useQueryUser(message.senderId);
  const readObserve = useReadObserve();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current == null) return;
    return readObserve(ref.current);
  }, [readObserve]);

  const nameNode = useMemo(
    () => <Name inGame={message.inGame} name={message.name} isMaster={isMaster} self={sendBySelf} user={user} />,
    [message.inGame, message.name, isMaster, sendBySelf, user],
  );
  const parsed: ParseResult = useMemo(
    (): ParseResult => messageToParsed(message.text, message.entities),
    [message.entities, message.text],
  );
  const mini = continuous || isAction;
  const draggable = sendBySelf || iAmMaster;

  return (
    <MessageBox
      sendBySelf={sendBySelf}
      inGame={message.inGame}
      message={message}
      draggable={draggable}
      overlay={overlay}
      isScrolling={isScrolling}
      mini={mini}
      optimistic={optimistic}
    >
      <div className={clsx('@2xl:text-right self-start', mini ? '@2xl:block hidden' : '')}>
        {!mini && <>{nameNode}:</>}
      </div>
      <div
        className="pr-message-small @2xl:pr-message"
        ref={ref}
        data-read-position={message.pos}
        data-is-last={isLast}
        onContextMenu={stopPropagation}
        onDoubleClick={stopPropagation}
      >
        {message.whisperToUsers != null && (
          <span className="text-surface-600 text-sm italic">
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

        {parsed.text !== '' && (
          <Content
            channelId={message.channelId}
            source={parsed.text}
            entities={parsed.entities}
            isAction={isAction}
            nameNode={nameNode}
            isArchived={message.folded}
            isPreview={false}
            seed={message.seed}
          />
        )}
        {message.mediaId != null && <MessageMedia className="pt-2" media={message.mediaId} />}
      </div>
    </MessageBox>
  );
};

const MessageBox: FC<{
  className?: string;
  children: ReactNode;
  message: Message;
  draggable?: boolean;
  mini?: boolean;
  overlay?: boolean;
  optimistic?: boolean;
  sendBySelf: boolean;
  isScrolling: boolean;
  inGame: boolean;
}> = ({
  className = '',
  inGame,
  children,
  draggable = false,
  overlay = false,
  message,
  mini = false,
  isScrolling,
  optimistic = false,
  sendBySelf,
}) => {
  const toolbarDisplayAtom = useMemo(makeMessageToolbarDisplayAtom, []);
  const store = useStore();
  const ref = useRef<HTMLDivElement | null>(null);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, setActivatorNodeRef } = useSortable({
    id: message.id,
    data: { message },
    disabled: !draggable || isScrolling,
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
    () =>
      draggable ? (
        <MessageReorderHandle
          ref={setActivatorNodeRef}
          attributes={attributes}
          listeners={listeners}
          loading={optimistic}
        />
      ) : (
        <div className="text-message-time-text col-span-1 row-span-full h-full text-right"></div>
      ),
    [attributes, draggable, listeners, optimistic, setActivatorNodeRef],
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
    <ToolbarDisplayContext.Provider value={toolbarDisplayAtom}>
      <div
        data-overlay={overlay}
        data-in-game={inGame}
        className={clsx(
          'group/msg relative grid grid-flow-col items-center gap-2 py-2 pl-2 pr-2',
          'grid-cols-[1.5rem_minmax(0,1fr)]',
          '@2xl:grid-cols-[1.5rem_12rem_minmax(0,1fr)]',
          !mini && '@2xl:grid-rows-1 grid-rows-[auto_auto]',
          inGame ? 'bg-message-inGame-bg' : 'bg-lowest',
          'data-[overlay=true]:shadow-lg',
          isDragging && 'opacity-0',
          className,
        )}
        ref={setRef}
        style={style}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      >
        {handle}
        {children}
        <div className="absolute right-2 top-1 select-none">
          <MessageTime message={message} />
        </div>
        {toolbar}
      </div>
    </ToolbarDisplayContext.Provider>
  );
};
