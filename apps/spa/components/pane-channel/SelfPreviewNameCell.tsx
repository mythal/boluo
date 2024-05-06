import { ReactNode, memo } from 'react';
import { PaneSize } from '../../hooks/usePaneSize';
import { IsActionIndicator } from './IsActionIndicator';

interface Props {
  isAction: boolean;
  paneSize: PaneSize;
  nameNode: ReactNode;
}

export const SelfPreviewNameCell = memo<Props>(({ nameNode, isAction, paneSize }) => {
  return (
    <div className="@2xl:flex-col @2xl:items-end @2xl:justify-start flex items-center justify-between gap-x-4 gap-y-1 pb-2">
      <div className="flex-shrink-1 @2xl:flex-shrink-0 relative max-w-full flex-grow rounded-sm">
        {!isAction ? <>{nameNode}:</> : <IsActionIndicator />}
      </div>
    </div>
  );
});
SelfPreviewNameCell.displayName = 'SelfPreviewNameCell';
