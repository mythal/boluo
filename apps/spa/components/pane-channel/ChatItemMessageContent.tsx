import { type FC, type ReactNode, useMemo } from 'react';
import { type ParseResult } from '@boluo/interpreter';
import { Content } from './Content';
import { type MessageItem } from '../../state/channel.types';
import { ContentGuard } from '@boluo/ui/chat/ContentGuard';
import { stopPropagation } from '@boluo/utils/browser';
import { MessageMedia } from './MessageMedia';

export const ChatItemMessageContent: FC<{
  message: MessageItem;
  parsed: ParseResult;
  nameNode: ReactNode;
}> = ({ message, parsed, nameNode }) => {
  const media = useMemo(() => {
    if (message.mediaId != null) {
      return <MessageMedia className="pt-2" media={message.mediaId} />;
    } else if (message.optimisticMedia != null) {
      return <MessageMedia className="pt-2" media={message.optimisticMedia} />;
    }
  }, [message.mediaId, message.optimisticMedia]);
  const shouldGuardContent =
    message.whisperToUsers != null && (parsed.text !== '' || media != null);

  const body = useMemo(() => {
    if (parsed.text === '') return null;
    return (
      <div>
        <Content
          source={parsed.text}
          entities={parsed.entities}
          isAction={message.isAction ?? false}
          nameNode={nameNode}
          isArchived={message.folded ?? false}
          seed={message.seed}
          onContextMenu={stopPropagation}
          onDoubleClick={stopPropagation}
        />
      </div>
    );
  }, [message.folded, message.isAction, message.seed, nameNode, parsed.entities, parsed.text]);

  return (
    <ContentGuard active={shouldGuardContent}>
      {body}
      {media}
    </ContentGuard>
  );
};
