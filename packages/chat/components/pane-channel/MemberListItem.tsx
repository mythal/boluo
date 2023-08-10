import { Member } from 'api';
import { FC } from 'react';
import { Avatar } from '../account/Avatar';

interface Props {
  member: Member;
}

export const MemberListItem: FC<Props> = ({ member: { user, space: spaceMember, channel: channelMember } }) => {
  return (
    <div className="flex items-start gap-1 text-sm p-1">
      <div className="w-6 h-6 flex-none">
        <Avatar size="1.5rem" name={user.nickname} id={user.id} avatarId={user.avatarId} />
      </div>
      {user.nickname}
    </div>
  );
};
