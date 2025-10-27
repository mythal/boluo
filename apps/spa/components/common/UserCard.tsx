import { type User } from '@boluo/api';
import { FloatingBox } from '@boluo/ui/FloatingBox';
import { Avatar } from '@boluo/ui/Avatar';
import { useQueryAppSettings } from '@boluo/common/hooks/useQueryAppSettings';

interface Props {
  user: User;
}

export const UserCard = ({ user }: Props) => {
  const { data: appSettings } = useQueryAppSettings();
  return (
    <FloatingBox>
      <div className="flex gap-2">
        <div>
          <Avatar
            className="rounded-sm"
            size="4rem"
            id={user.id}
            name={user.nickname}
            avatarId={user.avatarId}
            mediaUrl={appSettings?.mediaUrl}
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
