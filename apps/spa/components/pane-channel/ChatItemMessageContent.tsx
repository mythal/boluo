import { MessageComponentChanges } from './MessageComponentChanges';
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
  const entities = parsed.entities;

  const body = useMemo(() => {
    if (parsed.text === '') return null;
    return (
      <div>
        <Content
          source={parsed.text}
          entities={entities}
          message={{ id: message.id, hasEntryEffects: Boolean(message.hasEntryEffects) }}
          isAction={message.isAction ?? false}
          nameNode={nameNode}
          isArchived={message.folded ?? false}
          seed={message.seed}
          onContextMenu={stopPropagation}
          onDoubleClick={stopPropagation}
        />
      </div>
    );
  }, [
    message.folded,
    message.isAction,
    message.seed,
    message.id,
    message.hasEntryEffects,
    nameNode,
    entities,
    parsed.text,
  ]);

  return (
    <ContentGuard active={shouldGuardContent}>
      {body}
      {message.hasEntryEffects &&
        !parsed.entities.some(
          (entity) => entity.type === 'ComponentReport' && entity.report.type === 'Change',
        ) && (
          <div>
            <MessageComponentChanges messageId={message.id} />
          </div>
        )}
      {media}
    </ContentGuard>
  );
};
