import { Member } from 'api';
import { FC, MouseEventHandler } from 'react';
import { usePaneAdd } from '../../hooks/usePaneAdd';
import { Avatar } from '../account/Avatar';

interface Props {
  member: Member;
}

export const MemberListItem: FC<Props> = ({ member: { user, space: spaceMember, channel: channelMember } }) => {
  const addPane = usePaneAdd();
  const handleClick: MouseEventHandler<HTMLAnchorElement> = (e) => {
    e.preventDefault();
    addPane({
      type: 'PROFILE',
      userId: user.id,
    });
  };
  return (
    <a
      href="#" // TODO: link to user profile
      className="flex items-start gap-1 text-sm rounded-sm p-1 hover:bg-surface-100 active:bg-surface-200"
      onClick={handleClick}
    >
      <div className="w-6 h-6 flex-none">
        <Avatar size="1.5rem" name={user.nickname} id={user.id} avatarId={user.avatarId} />
      </div>
      {user.nickname}
    </a>
  );
};
