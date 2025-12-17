import { Users } from '@boluo/icons';
import { useAtom } from 'jotai';
import { type FC, useMemo } from 'react';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { useQueryChannelMembers } from '@boluo/hooks/useQueryChannelMembers';
import { useQueryUsersStatus } from '@boluo/hooks/useQueryUsersStatus';
import { PaneHeaderButton } from '@boluo/ui/PaneHeaderButton';

interface Props {
  channelId: string;
  spaceId: string;
}

export const ChannelMembersButton: FC<Props> = ({ channelId, spaceId }) => {
  const { subPaneStateAtom } = useChannelAtoms();
  const [subPaneState, setSubPaneState] = useAtom(subPaneStateAtom);
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
    <PaneHeaderButton
      active={subPaneState === 'MEMBER_LIST'}
      isLoading={isLoading}
      onClick={() =>
        setSubPaneState((prevState) => (prevState === 'MEMBER_LIST' ? 'NONE' : 'MEMBER_LIST'))
      }
    >
      <Users />
      {membersInfo != null && (
        <span className="hidden text-xs @xl:inline">
          {onlineCount}/{membersInfo.members.length}
        </span>
      )}
    </PaneHeaderButton>
  );
};
