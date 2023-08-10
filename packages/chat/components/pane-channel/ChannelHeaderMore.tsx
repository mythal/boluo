import { useMe } from 'common';
import { FC } from 'react';
import { useMyChannelMember } from '../../hooks/useMyChannelMember';
import { ChannelSettingsButton } from './ChannelSettingsButton';
import { MemberLeaveButton } from './MemberLeaveButton';

interface Props {
  channelId: string;
  resetHeaderState: () => void;
}

export const ChannelHeaderMore: FC<Props> = ({ channelId, resetHeaderState }) => {
  const me = useMe();
  const member = useMyChannelMember(channelId);
  return (
    <div className="py-2 px-4 border-b flex justify-between gap-2">
      {(me && me !== 'LOADING') && <MemberLeaveButton me={me} channelId={channelId} onSuccess={resetHeaderState} />}
      {member != null && member !== 'LOADING' && member.space.isAdmin && (
        <ChannelSettingsButton
          channelId={channelId}
        />
      )}
    </div>
  );
};
