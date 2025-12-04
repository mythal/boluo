import { type FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { type ParseResult } from '@boluo/interpreter';
import { type MessageItem } from '../../state/channel.types';
import { ChatItemMessageShowWhisper } from './ChatItemMessageShowWhisper';

export const ChatItemMessageWhisperIndicator: FC<{
  message: MessageItem;
  parsed: ParseResult;
}> = ({ message, parsed }) => {
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
};
