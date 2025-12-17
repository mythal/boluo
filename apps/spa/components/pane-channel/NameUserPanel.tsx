import { useQueryAppSettings } from '@boluo/hooks/useQueryAppSettings';
import { useQueryUser } from '@boluo/hooks/useQueryUser';
import { UserCard } from '@boluo/ui/users/UserCard';
import { UserCardLoading } from '@boluo/ui/users/UserCardLoading';
import { UserCardError } from '@boluo/ui/users/UserCardError';
import { type FC } from 'react';

interface Props {
  userId: string;
}

export const NameUserPanel: FC<Props> = ({ userId }) => {
  const { data: appSettings } = useQueryAppSettings();

  const { data: user, isLoading, error } = useQueryUser(userId);

  if (isLoading) {
    return <UserCardLoading />;
  }

  if (error || user == null || appSettings == null) {
    return <UserCardError />;
  }

  return <UserCard user={user} mediaUrl={appSettings.mediaUrl} />;
};
