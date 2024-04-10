/* eslint-disable @next/next/no-img-element */
import clsx from 'clsx';
import { FC, useMemo } from 'react';
import { FormattedMessage } from 'react-intl';
import { fromRawEntities } from '../../interpreter/entities';
import { initParseResult, ParseResult } from '../../interpreter/parse-result';
import { MessageItem } from '../../state/channel.types';
import { ChatItemMessageShowWhisper } from './ChatItemMessageShowWhisper';
import { Content } from './Content';
import { MessageBox } from './MessageBox';
import { MessageMedia } from './MessageMedia';
import { Name } from './Name';
import { useQueryUser } from '@boluo/common';
import { useMessageColor } from '../../hooks/useMessageColor';
import { ResolvedTheme } from '@boluo/theme';

interface Props {
  iAmAdmin: boolean;
  iAmMaster: boolean;
  message: MessageItem;
  className?: string;
  self: boolean;
  continuous?: boolean;
  overlay?: boolean;
  theme: ResolvedTheme;
}

export const ChatItemMessage: FC<Props> = ({
  message,
  className = '',
  self,
  continuous = false,
  iAmAdmin,
  iAmMaster,
  overlay = false,
  theme,
}) => {
  const { isMaster, isAction, optimistic } = message;
  const { data: user } = useQueryUser(message.senderId);

  const color = useMessageColor(theme, user, message.inGame, message.color);

  const nameNode = useMemo(
    () => <Name inGame={message.inGame} name={message.name} isMaster={isMaster} self={self} color={color} />,
    [message.inGame, message.name, isMaster, self, color],
  );
  const parsed: ParseResult = useMemo((): ParseResult => {
    const text = message.text;
    const rawEntities = message.entities;
    if (!Array.isArray(rawEntities) || text === null) {
      return initParseResult;
    }
    const entities = fromRawEntities(text, rawEntities);
    return { ...initParseResult, text, entities };
  }, [message.entities, message.text]);
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
      mini={mini}
      optimistic={optimistic}
    >
      <div className={clsx('@2xl:text-right self-start', mini ? '@2xl:block hidden' : '')}>
        {!mini && <>{nameNode}:</>}
      </div>
      <div className="@2xl:pr-messageRight">
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
