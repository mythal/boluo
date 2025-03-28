import { type FC, useDeferredValue, useMemo } from 'react';
import { fromRawEntities } from '../../interpreter/entities';
import { emptyParseResult, type ParseResult } from '../../interpreter/parse-result';
import { type PreviewItem } from '../../state/channel.types';
import { Content } from './Content';
import { Name } from './Name';
import { OthersPreviewNoBroadcast } from './OthersPreviewNoBroadcast';
import { PreviewBox } from './PreviewBox';
import { useQueryUser } from '@boluo/common';

interface Props {
  preview: PreviewItem;
  isLast: boolean;
}

export const OthersPreview: FC<Props> = ({ preview, isLast }) => {
  const { isMaster, isAction, name } = preview;

  const parsed: ParseResult = useMemo(() => {
    const text = preview.text || '';
    const entities = fromRawEntities(text, preview.entities);
    return { ...emptyParseResult, text, entities };
  }, [preview.text, preview.entities]);
  const { data: sender } = useQueryUser(preview.senderId);

  const nameNode = useMemo(() => {
    return (
      <Name inGame={preview.inGame} name={name} isMaster={isMaster} user={sender} isPreview self />
    );
  }, [isMaster, name, preview.inGame, sender]);

  const { text: source, entities } = useDeferredValue(parsed);

  return (
    <PreviewBox
      id={preview.id}
      editMode={preview.edit !== null}
      isSelf={false}
      inGame={preview.inGame}
      isLast={isLast}
      pos={preview.pos}
      className="text-text-light pr-message-small @2xl:pr-message"
    >
      <div className="@2xl:flex-col flex gap-1">
        <div className="@2xl:text-right">{isAction ? null : <>{nameNode}:</>}</div>
      </div>
      {preview.text === null ? (
        <OthersPreviewNoBroadcast timestamp={preview.timestamp} />
      ) : (
        <div>
          <Content
            source={source}
            entities={entities}
            isAction={preview.isAction}
            isArchived={false}
            nameNode={nameNode}
          />
        </div>
      )}
    </PreviewBox>
  );
};
