import clsx from 'clsx';
import { FC, useEffect, useMemo, useRef, useState } from 'react';
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
import { offset, useFloating, useHover, useInteractions } from '@floating-ui/react';
import { Archive, Edit, EllipsisVertical } from '@boluo/icons';
import { useMember } from '../../hooks/useMember';

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
  const ref = useRef<HTMLDivElement | null>(null);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, setActivatorNodeRef } = useSortable({
    id: message.id,
    data: { message },
    disabled: !draggable || isScrolling,
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open: isMenuOpen,
    onOpenChange: setIsMenuOpen,
    placement: 'top-end',
    middleware: [offset({ mainAxis: -20, crossAxis: -4 })],
  });
  const hover = useHover(context, {
    enabled: !isDragging && !overlay,
  });
  const { getReferenceProps, getFloatingProps } = useInteractions([hover]);

  const setRef = (node: HTMLDivElement | null) => {
    ref.current = node;
    refs.setReference(node);
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
  return (
    <div
      data-overlay={overlay}
      data-in-game={inGame}
      className={clsx(
        'relative grid grid-flow-col items-center gap-2 py-2 pl-2 pr-2',
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
      {...getReferenceProps()}
    >
      {handle}
      {children}
      {/* {(self || iAmMaster || iAmAdmin) && toolbox} */}
      <div className="absolute right-2 top-1">
        <MessageTime message={message} />
      </div>
      {isMenuOpen && !isDragging && !overlay && (
        <div
          ref={refs.setFloating}
          style={floatingStyles}
          {...getFloatingProps()}
          className="border-surface-300 flex gap-1 rounded-sm border bg-white p-2 shadow-sm"
        >
          <MessageToolbar sendBySelf={sendBySelf} />
        </div>
      )}
    </div>
  );
};

const MessageToolbar: FC<{ sendBySelf: boolean }> = ({ sendBySelf }) => {
  const member = useMember();
  const admin = member?.space.isAdmin || false;
  const master = member?.channel.isMaster || false;
  const permsArchive = admin || master || sendBySelf;
  const permsDelete = admin || sendBySelf;
  const permsEdit = sendBySelf;
  return (
    <>
      {permsArchive && <Archive />}
      {permsEdit && <Edit />}
      <EllipsisVertical />
    </>
  );
};
