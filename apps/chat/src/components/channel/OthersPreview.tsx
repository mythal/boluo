import type { Preview } from 'api';
import { FC, useMemo } from 'react';
import { Content } from './Content';
import { Name } from './Name';
import { PreviewBox } from './PreviewBox';

interface Props {
  preview: Preview;
  className?: string;
}

export const OthersPreview: FC<Props> = ({ preview, className = '' }) => {
  const { isMaster, isAction, name } = preview;

  const nameNode = useMemo(() => {
    return <Name name={name} isMaster={isMaster} isPreview self />;
  }, [isMaster, name]);
  return (
    <PreviewBox id={preview.id} className="text-surface-600">
      <div className="flex @2xl:flex-col gap-1">
        <div className="@2xl:text-right">
          {!isAction && nameNode}
        </div>
      </div>
      <Content text={preview.text || ''} nameNode={nameNode} isAction={isAction} />
    </PreviewBox>
  );
};
