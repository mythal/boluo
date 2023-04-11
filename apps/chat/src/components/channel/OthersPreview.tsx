import type { Preview } from 'api';
import clsx from 'clsx';
import { FC, useMemo } from 'react';
import { Content } from './Content';
import { Name } from './Name';
import { PreviewHandlePlaceHolder } from './PreviewHandlePlaceHolder';

interface Props {
  preview: Preview;
  className?: string;
}

export const OthersPreview: FC<Props> = ({ preview, className = '' }) => {
  const { isMaster, inGame, isAction, channelId, name } = preview;

  const nameNode = useMemo(() => {
    return <Name name={name} isMaster={isMaster} isPreview self />;
  }, [isMaster, name]);
  return (
    <>
      <div className="flex @2xl:flex-col gap-1">
        <div className="@2xl:text-right">
          {!isAction && nameNode}
        </div>
      </div>
      <Content text={preview.text || ''} nameNode={nameNode} isAction={isAction} />
    </>
  );
};
