import { type ReactNode, memo } from 'react';
import { IsActionIndicator } from './IsActionIndicator';

interface Props {
  isAction: boolean;
  nameNode: ReactNode;
}

export const SelfPreviewNameCell = memo<Props>(({ nameNode, isAction }: Props) => {
  return (
    <div className="flex items-center justify-between gap-x-4 gap-y-1 pb-2 @2xl:flex-col @2xl:items-end @2xl:justify-start">
      <div className="relative max-w-full flex-shrink-1 grow rounded-sm @2xl:shrink-0">
        {!isAction ? nameNode : <IsActionIndicator />}
      </div>
    </div>
  );
});
SelfPreviewNameCell.displayName = 'SelfPreviewNameCell';
