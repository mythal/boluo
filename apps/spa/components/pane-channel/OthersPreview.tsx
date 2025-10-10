import { type FC, useDeferredValue, useMemo } from 'react';
import { emptyParseResult, type ParseResult } from '../../interpreter/parse-result';
import { type PreviewItem } from '../../state/channel.types';
import { Content } from './Content';
import { Name } from './Name';
import { OthersPreviewNoBroadcast } from './OthersPreviewNoBroadcast';
import { PreviewBox } from './PreviewBox';
import { useQueryUser } from '@boluo/common/hooks/useQueryUser';

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
  const { data: sender } = useQueryUser(preview.senderId);

  const nameNode = useMemo(() => {
    return (
      <Name
        inGame={preview.inGame ?? false}
        name={name}
        isMaster={isMaster ?? false}
        user={sender}
        isPreview
        self
      />
    );
  }, [isMaster, name, preview.inGame, sender]);

  const { text: source, entities } = useDeferredValue(parsed);

  return (
    <PreviewBox
      id={preview.id}
      editMode={preview.edit != null}
      isSelf={false}
      inGame={preview.inGame ?? false}
      isLast={isLast}
      pos={preview.pos}
      className="text-text-secondary pr-message-small @2xl:pr-message"
    >
      <div className="flex gap-1 @2xl:flex-col">
        <div className="@2xl:text-right">{isAction ? null : <>{nameNode}:</>}</div>
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
