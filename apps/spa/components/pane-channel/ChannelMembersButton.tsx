import { Users } from '@boluo/icons';
import { useAtom } from 'jotai';
import { type FC, useMemo } from 'react';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { useQueryChannelMembers } from '../../hooks/useQueryChannelMembers';
import { useQueryUsersStatus } from '../../hooks/useQueryUsersStatus';
import { SidebarHeaderButton } from '../sidebar/SidebarHeaderButton';

interface Props {
  channelId: string;
  spaceId: string;
}

export const ChannelMembersButton: FC<Props> = ({ channelId, spaceId }) => {
  const { memberListStateAtom } = useChannelAtoms();
  const [memberListState, setMemberListState] = useAtom(memberListStateAtom);
  const { data: membersInfo, isLoading } = useQueryChannelMembers(channelId);
  const { data: userStatus } = useQueryUsersStatus(spaceId);
  const onlineCount = useMemo(() => {
    if (membersInfo == null || userStatus == null) return 0;
    const { members } = membersInfo;
    return members.reduce((count, member) => {
      const status = userStatus[member.user.id];
      if (status == null) return count;
      if (status.kind === 'ONLINE') return count + 1;
      return count;
    }, 0);
  }, [membersInfo, userStatus]);
  return (
    <SidebarHeaderButton
      active={memberListState !== 'CLOSED'}
      isLoading={isLoading}
      onClick={() =>
        setMemberListState((prevState) => (prevState !== 'CLOSED' ? 'CLOSED' : 'RIGHT'))
      }
    >
      <Users />
      {membersInfo != null && (
        <span className="hidden text-xs @xl:inline">
          {onlineCount}/{membersInfo.members.length}
        </span>
      )}
    </SidebarHeaderButton>
  );
};
