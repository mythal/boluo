import { FC, useDeferredValue, useMemo } from 'react';
import { fromRawEntities } from '../../interpreter/entities';
import { emptyParseResult, ParseResult } from '../../interpreter/parse-result';
import { PreviewItem } from '../../state/channel.types';
import { Content } from './Content';
import { Name } from './Name';
import { OthersPreviewNoBroadcast } from './OthersPreviewNoBroadcast';
import { PreviewBox } from './PreviewBox';
import { ResolvedTheme } from '@boluo/theme';
import { useQueryUser } from '@boluo/common';

interface Props {
  preview: PreviewItem;
  theme: ResolvedTheme;
  isLast: boolean;
}

export const OthersPreview: FC<Props> = ({ preview, theme, isLast }) => {
  const { isMaster, isAction, name } = preview;

  const parsed: ParseResult = useMemo(() => {
    const text = preview.text || '';
    const entities = fromRawEntities(text, preview.entities);
    return { ...emptyParseResult, text, entities };
  }, [preview.text, preview.entities]);
  const { data: sender } = useQueryUser(preview.senderId);

  const nameNode = useMemo(() => {
    return <Name inGame={preview.inGame} name={name} isMaster={isMaster} user={sender} theme={theme} isPreview self />;
  }, [isMaster, name, preview.inGame, sender, theme]);

  const { text: source, entities } = useDeferredValue(parsed);

  return (
    <PreviewBox
      id={preview.id}
      editMode={preview.editFor !== null}
      isSelf={false}
      inGame={preview.inGame}
      isLast={isLast}
      className="text-surface-600 @2xl:pr-messageRight"
    >
      <div className="@2xl:flex-col flex gap-1">
        <div className="@2xl:text-right">{isAction ? null : <>{nameNode}:</>}</div>
      </div>
      {preview.text === null ? (
        <OthersPreviewNoBroadcast timestamp={preview.timestamp} />
      ) : (
        <Content
          channelId={preview.channelId}
          source={source}
          entities={entities}
          isAction={preview.isAction}
          isArchived={false}
          nameNode={nameNode}
          isPreview
        />
      )}
    </PreviewBox>
  );
};
