import { FC } from 'react';
import { useQueryChannelMembers } from '../../hooks/useQueryChannelMembers';
import { MemberListItem } from './MemberListItem';

interface Props {
  className?: string;
  channelId: string;
}

const MemberListLoading: FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={className}>
      <div className="p-2">
        …
      </div>
    </div>
  );
};

export const MemberList: FC<Props> = ({ className, channelId }) => {
  const { data: membersData, error } = useQueryChannelMembers(channelId);
  if (error) {
    // TODO: handle error
    return null;
  }
  if (!membersData) {
    return <MemberListLoading className={className} />;
  }
  const { members } = membersData;
  return (
    <div className={className}>
      {members.map((member) => <MemberListItem key={member.user.id} member={member} />)}
    </div>
  );
};
