/* eslint-disable @next/next/no-img-element */
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
import { ResolvedTheme } from '@boluo/theme';
import { messageToParsed } from '../../interpreter/to-parsed';
import { useIsScrolling } from '../../hooks/useIsScrolling';
import { useReadObserve } from '../../hooks/useReadObserve';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Message } from '@boluo/api';
import { ReactNode } from 'react';
import { Delay } from '../Delay';
import { MessageReorderHandle } from './MessageReorderHandle';
import { MessageToolbox } from './MessageToolbox';
import { MessageTime } from './MessageTime';

export const ChatItemMessage: FC<{
  iAmAdmin: boolean;
  iAmMaster: boolean;
  message: MessageItem;
  className?: string;
  self: boolean;
  isLast: boolean;
  continuous?: boolean;
  overlay?: boolean;
  theme: ResolvedTheme;
}> = ({ message, self, continuous = false, iAmAdmin, iAmMaster, overlay = false, theme, isLast }) => {
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
    () => (
      <Name inGame={message.inGame} name={message.name} isMaster={isMaster} self={self} user={user} theme={theme} />
    ),
    [message.inGame, message.name, isMaster, self, user, theme],
  );
  const parsed: ParseResult = useMemo(
    (): ParseResult => messageToParsed(message.text, message.entities),
    [message.entities, message.text],
  );
  const mini = continuous || isAction;
  const draggable = self || iAmMaster;

  return (
    <MessageBox
      self={self}
      inGame={message.inGame}
      iAmAdmin={iAmAdmin}
      iAmMaster={iAmMaster}
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
  self: boolean;
  iAmMaster: boolean;
  iAmAdmin: boolean;
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
  self,
  iAmMaster,
  iAmAdmin,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, setActivatorNodeRef } = useSortable({
    id: message.id,
    data: { message },
    disabled: !draggable || isScrolling,
  });

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
  const toolbox = useMemo(
    () => (
      <Delay timeout={400}>
        <div
          className={clsx(
            'absolute right-3 top-0 z-10 hidden max-h-full -translate-y-4 group-hover:z-20 group-hover:block',
          )}
        >
          <MessageToolbox message={message} self={self} iAmAdmin={iAmAdmin} iAmMaster={iAmMaster} />
        </div>
      </Delay>
    ),
    [iAmAdmin, iAmMaster, message, self],
  );
  return (
    <div
      data-overlay={overlay}
      data-in-game={inGame}
      className={clsx(
        'group relative grid grid-flow-col items-center gap-2 py-2 pl-2 pr-2',
        'grid-cols-[1.5rem_minmax(0,1fr)]',
        '@2xl:grid-cols-[1.5rem_12rem_minmax(0,1fr)]',
        !mini && '@2xl:grid-rows-1 grid-rows-[auto_auto]',
        inGame ? 'bg-message-inGame-bg' : '',
        'data-[overlay=true]:bg-surface-300/30 data-[overlay=true]:data-[in-game=true]:bg-message-inGame-bg/75 data-[overlay=true]:backdrop-blur-sm',
        isDragging && 'opacity-0',
        className,
      )}
      ref={setNodeRef}
      style={style}
    >
      {handle}
      {children}
      {(self || iAmMaster || iAmAdmin) && toolbox}
      <div className="absolute bottom-1 right-2">
        <MessageTime message={message} />
      </div>
    </div>
  );
};
