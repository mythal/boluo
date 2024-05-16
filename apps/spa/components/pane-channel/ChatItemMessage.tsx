/* eslint-disable @next/next/no-img-element */
import clsx from 'clsx';
import { FC, useEffect, useMemo, useRef } from 'react';
import { FormattedMessage } from 'react-intl';
import { ParseResult } from '../../interpreter/parse-result';
import { MessageItem } from '../../state/channel.types';
import { ChatItemMessageShowWhisper } from './ChatItemMessageShowWhisper';
import { Content } from './Content';
import { MessageBox } from './MessageBox';
import { MessageMedia } from './MessageMedia';
import { Name } from './Name';
import { useQueryUser } from '@boluo/common';
import { ResolvedTheme } from '@boluo/theme';
import { messageToParsed } from '../../interpreter/to-parsed';
import { useIsScrolling } from '../../hooks/useIsScrolling';
import { useReadObserve } from '../../hooks/useReadObserve';
import { Delay } from '../Delay';
import { FallbackIcon } from '../FallbackIcon';
import Icon from '@boluo/ui/Icon';
import { Edit } from '@boluo/icons';
import React from 'react';
import { Message } from '@boluo/api';
import { useSetAtom } from 'jotai';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';

interface Props {
  iAmAdmin: boolean;
  iAmMaster: boolean;
  message: MessageItem;
  className?: string;
  self: boolean;
  isLast: boolean;
  continuous?: boolean;
  overlay?: boolean;
  theme: ResolvedTheme;
}

export const ChatItemMessage: FC<Props> = ({
  message,
  self,
  continuous = false,
  iAmAdmin,
  iAmMaster,
  overlay = false,
  theme,
  isLast,
}) => {
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
  const tailNode = useMemo(() => (self ? <InlineEditButton message={message} /> : null), [message, self]);

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
            tailNode={tailNode}
          />
        )}
        {message.mediaId != null && <MessageMedia className="pt-2" media={message.mediaId} />}
      </div>
    </MessageBox>
  );
};

const InlineEditButton = ({ message }: { message: Message }) => {
  const { composeAtom } = useChannelAtoms();
  const dispatch = useSetAtom(composeAtom);
  const handleClick = () => {
    dispatch({ type: 'editMessage', payload: { message } });
  };
  return (
    <button
      className="bg-preview-toolbar-bg text-text-light hover:text-text-base ml-1 select-none rounded-sm px-1 py-px text-xs opacity-60 shadow-sm group-hover:opacity-100"
      onClick={handleClick}
    >
      <Delay fallback={<FallbackIcon />}>
        <Icon icon={Edit} />
      </Delay>
      <span className="ml-0.5">
        <FormattedMessage defaultMessage="Edit" />
      </span>
    </button>
  );
};
