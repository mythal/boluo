import type { Preview } from 'api';
import { FC, useDeferredValue, useMemo } from 'react';
import { fromRawEntities } from '../../interpreter/entities';
import { ParseResult } from '../../interpreter/parser';
import { Content } from './Content';
import { Name } from './Name';
import { PreviewBox } from './PreviewBox';

interface Props {
  preview: Preview;
  className?: string;
}

export const OthersPreview: FC<Props> = ({ preview, className = '' }) => {
  const { isMaster, isAction, name } = preview;

  const parsed: ParseResult = useMemo(() => {
    const text = preview.text || '';
    const entities = fromRawEntities(text, preview.entities);
    return { text, entities };
  }, [preview.entities, preview.text]);

  const nameNode = useMemo(() => {
    return <Name name={name} isMaster={isMaster} isPreview self />;
  }, [isMaster, name]);

  const deferredParsed = useDeferredValue(parsed);

  return (
    <PreviewBox id={preview.id} editMode={preview.editFor !== null} className="text-surface-600">
      <div className="flex @2xl:flex-col gap-1">
        <div className="@2xl:text-right">
          {!isAction && nameNode}
        </div>
      </div>
      <Content parsed={deferredParsed} nameNode={nameNode} isAction={isAction} isPreview />
    </PreviewBox>
  );
};
