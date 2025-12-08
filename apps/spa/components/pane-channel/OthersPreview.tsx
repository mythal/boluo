import { type FC, useDeferredValue, useMemo } from 'react';
import { emptyParseResult, type ParseResult } from '@boluo/interpreter';
import { type PreviewItem } from '../../state/channel.types';
import { Content } from './Content';
import { Name } from './Name';
import { OthersPreviewNoBroadcast } from './OthersPreviewNoBroadcast';
import { PreviewBox } from '@boluo/ui/chat/PreviewBox';
import { useQueryUser } from '@boluo/common/hooks/useQueryUser';
import { useIsInGameChannel } from '../../hooks/useIsInGameChannel';

interface Props {
  preview: PreviewItem;
  isLast: boolean;
}

export const OthersPreview: FC<Props> = ({ preview, isLast }) => {
  const { isMaster, isAction, name } = preview;

  const parsed: ParseResult = useMemo(() => {
    const text = preview.text || '';
    const entities = preview.entities;
    return { ...emptyParseResult, text, entities };
  }, [preview.text, preview.entities]);

  const nameNode = useMemo(() => {
    return (
      <Name
        inGame={preview.inGame ?? false}
        name={name}
        isMaster={isMaster ?? false}
        userId={preview.senderId}
        isPreview
        self
      />
    );
  }, [isMaster, name, preview.inGame, preview.senderId]);

  const { text: source, entities } = useDeferredValue(parsed);
  const isInGameChannel = useIsInGameChannel();

  return (
    <PreviewBox
      id={preview.id}
      inEditMode={preview.edit != null}
      isSelf={false}
      inGame={preview.inGame ?? false}
      isInGameChannel={isInGameChannel}
      isLast={isLast}
      pos={preview.pos}
      className="text-text-secondary pr-message-small compact:pr-message-compact irc:pr-message"
    >
      <div className="irc:flex-col flex gap-1">
        <div className="irc:text-right">{isAction ? null : <>{nameNode}:</>}</div>
      </div>
      {preview.text == null ? (
        <OthersPreviewNoBroadcast timestamp={preview.timestamp} />
      ) : (
        <div>
          <Content
            source={source}
            entities={entities}
            isAction={preview.isAction ?? false}
            isArchived={false}
            nameNode={nameNode}
          />
        </div>
      )}
    </PreviewBox>
  );
};
