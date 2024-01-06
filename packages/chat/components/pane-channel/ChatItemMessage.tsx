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

interface Props {
  message: MessageItem;
  className?: string;
  self: boolean;
  continuous?: boolean;
}

export const ChatItemMessage: FC<Props> = ({ message, className = '', self, continuous = false }) => {
  const { isMaster, isAction, optimistic } = message;

  const nameNode = useMemo(
    () => <Name name={message.name} isMaster={isMaster} self={self} />,
    [isMaster, message.name, self],
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

  return (
    <MessageBox self={self} message={message} draggable={self} mini={mini} optimistic={optimistic}>
      <div className={clsx('@2xl:text-right self-start', mini ? '@2xl:block hidden' : '')}>
        {!mini && <>{nameNode}:</>}
      </div>
      <div className="@2xl:pr-[6rem]">
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
            isPreview={false}
            seed={message.seed}
          />
        )}
        {message.mediaId != null && <MessageMedia className="pt-2" mediaId={message.mediaId} />}
      </div>
    </MessageBox>
  );
};
