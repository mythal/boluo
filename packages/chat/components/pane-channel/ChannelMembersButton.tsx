import { Channel } from 'api';
import { Users } from 'icons';
import { FC, useMemo } from 'react';
import { Button } from 'ui/Button';
import { useQueryChannelMembers } from '../../hooks/useQueryChannelMembers';

interface Props {
  channelId: string;
}

export const ChannelMembersButton: FC<Props> = ({ channelId }) => {
  const { data: membersInfo, isLoading } = useQueryChannelMembers(channelId);
  const onlineCount = useMemo(() => {
    if (membersInfo == null) return 0;
    const { heartbeatMap } = membersInfo;
    return 0;
  }, [membersInfo]);
  return (
    <Button data-small disabled={isLoading}>
      <Users />
      {membersInfo != null && (
        <span className="hidden @lg:inline">
          {onlineCount}
        </span>
      )}
    </Button>
  );
};
