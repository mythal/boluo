import { Channel } from 'api';
import { Users } from 'icons';
import { useAtom } from 'jotai';
import { FC, useMemo } from 'react';
import { Button } from 'ui/Button';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { useQueryChannelMembers } from '../../hooks/useQueryChannelMembers';

interface Props {
  channelId: string;
}

export const ChannelMembersButton: FC<Props> = ({ channelId }) => {
  const { memberListStateAtom } = useChannelAtoms();
  const [memberListState, setMemberListState] = useAtom(memberListStateAtom);
  const { data: membersInfo, isLoading } = useQueryChannelMembers(channelId);
  const onlineCount = useMemo(() => {
    if (membersInfo == null) return 0;
    const { heartbeatMap } = membersInfo;
    return 0;
  }, [membersInfo]);
  return (
    <Button
      data-small
      data-active={memberListState !== 'CLOSED'}
      disabled={isLoading}
      onClick={() => setMemberListState(prevState => prevState !== 'CLOSED' ? 'CLOSED' : 'RIGHT')}
    >
      <Users />
      {membersInfo != null && (
        <span className="hidden @xl:inline">
          {onlineCount}/{membersInfo.members.length}
        </span>
      )}
    </Button>
  );
};
