import type { User } from '@boluo/api';
import clsx from 'clsx';
import type { FC } from 'react';
import { Avatar } from '@boluo/ui/users/Avatar';
import { ShowUsername } from './ShowUsername';
import { FormattedMessage } from 'react-intl';
import { useQueryAppSettings } from '@boluo/hooks/useQueryAppSettings';

interface Props {
  user: User;
}

export const PaneProfileView: FC<Props> = ({ user }) => {
  const { data: appSettings } = useQueryAppSettings();
  return (
    <div className="p-pane">
      <div className="">
        <Avatar
          id={user.id}
          avatarId={user.avatarId}
          name={user.nickname}
          size="6rem"
          className={clsx('rounded-md @xs:float-right')}
          mediaUrl={appSettings?.mediaUrl}
        />
        <div className="">
          <ShowUsername username={user.username} />
          <div className="overflow-hidden py-2 pr-2 text-xl text-ellipsis whitespace-nowrap">
            {user.nickname}
          </div>
          {user.bio !== '' ? (
            <div className="max-w-md whitespace-pre-line">{user.bio}</div>
          ) : (
            <div className="text-text-muted text-sm">
              <FormattedMessage defaultMessage="Have not set a bio yet" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
