import { type User } from '@boluo/api';
import { FloatingBox } from '@boluo/ui/FloatingBox';
import { Avatar } from './Avatar';

interface Props {
  user: User;
  mediaUrl: string | null | undefined;
}

export const UserCard = ({ user, mediaUrl }: Props) => {
  return (
    <FloatingBox className="p-3">
      <div className="flex max-w-[200px] gap-2 overflow-clip md:max-w-sm">
        <div className="flex-none">
          <Avatar
            className="rounded-sm"
            size="4rem"
            id={user.id}
            name={user.nickname}
            avatarId={user.avatarId}
            mediaUrl={mediaUrl}
          />
        </div>
        <div className="flex flex-col gap-1">
          <div className="font-bold">{user.nickname}</div>
          <div className="text-text-muted text-sm">{user.username}</div>
          {user.bio && <div className="text-text-secondary">{user.bio}</div>}
        </div>
      </div>
    </FloatingBox>
  );
};
