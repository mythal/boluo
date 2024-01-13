import { ChannelMember } from 'api';
import { memo } from 'react';
import { IsActionIndicator } from './IsActionIndicator';
import { Name } from './Name';
import { NameToolbox } from './NameToolbox';

interface Props {
  inGame: boolean;
  isAction: boolean;
  name: string;
  channelMember: ChannelMember;
}
export const SelfPreviewNameCell = memo<Props>(({ inGame, name, isAction, channelMember }) => {
  const { isMaster, characterName } = channelMember;
  return (
    <div className="@2xl:flex-col @2xl:items-end @2xl:justify-start flex items-center justify-between gap-x-4 gap-y-1 pb-2">
      <div className="flex-shrink-1 @2xl:flex-shrink-0 relative max-w-full flex-grow">
        {!isAction ? <Name inGame={inGame} name={name} isMaster={isMaster} isPreview self /> : <IsActionIndicator />}
        <NameToolbox channelMember={channelMember} />
      </div>
    </div>
  );
});
SelfPreviewNameCell.displayName = 'SelfPreviewNameCell';
