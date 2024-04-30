import { User } from '@boluo/api';
import { FloatingBox } from './FloatingBox';
import { Avatar } from '../account/Avatar';

interface Props {
  user: User;
}

export const UserCard = ({ user }: Props) => {
  return (
    <FloatingBox>
      <div className="flex gap-2">
        <div>
          <Avatar className="rounded-sm" size="4rem" id={user.id} name={user.nickname} avatarId={user.avatarId} />
        </div>
        <div className="flex flex-col gap-1">
          <div className="font-bold">{user.nickname}</div>
          <div className="text-text-lighter text-sm">{user.username}</div>
          {user.bio && <div className="text-text-light">{user.bio}</div>}
        </div>
      </div>
    </FloatingBox>
  );
};
