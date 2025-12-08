import { type ReactNode, memo } from 'react';
import { IsActionIndicator } from '@boluo/ui/chat/IsActionIndicator';

interface Props {
  isAction: boolean;
  nameNode: ReactNode;
}

export const SelfPreviewNameCell = memo<Props>(({ nameNode, isAction }: Props) => {
  return (
    <div className="SelfPreviewNameCell irc:flex-col irc:items-end irc:justify-start flex items-center justify-between gap-x-4 gap-y-1 pb-2">
      <div className="irc:shrink-0 relative max-w-full shrink grow rounded-sm">
        {!isAction ? nameNode : <IsActionIndicator />}
      </div>
    </div>
  );
});
SelfPreviewNameCell.displayName = 'SelfPreviewNameCell';
