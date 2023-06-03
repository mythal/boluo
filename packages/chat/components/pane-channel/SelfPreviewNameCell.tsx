import { memo, ReactNode } from 'react';
import { InGameSwitchButton } from '../compose/InGameSwitchButton';
import { IsActionIndicator } from './IsActionIndicator';
import { NameInput } from './NameInput';

interface Props {
  inGame: boolean;
  isAction: boolean;
  nameNode: ReactNode;
}

export const SelfPreviewNameCell = memo<Props>(({ inGame, isAction, nameNode }) => {
  return (
    <div className="flex @2xl:flex-col pb-2 gap-y-1 gap-x-4 items-center @2xl:items-end justify-between @2xl:justify-start">
      <div className="flex-grow flex-shrink-1 truncate @2xl:flex-shrink-0">
        {!isAction ? <>{nameNode}:</> : <IsActionIndicator />}
      </div>
      <div className="flex-shrink flex gap-1 h-8">
        {inGame && <NameInput className="text-sm w-[5rem] @xs:w-[7rem] @2xl:w-full " />}
        <InGameSwitchButton type="ICON" />
      </div>
    </div>
  );
});
SelfPreviewNameCell.displayName = 'SelfPreviewNameCell';
