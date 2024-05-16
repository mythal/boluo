/* eslint-disable @next/next/no-img-element */
import clsx from 'clsx';
import { FC, useEffect, useMemo, useRef } from 'react';
import { FormattedMessage } from 'react-intl';
import { fromRawEntities } from '../../interpreter/entities';
import { emptyParseResult, ParseResult } from '../../interpreter/parse-result';
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
