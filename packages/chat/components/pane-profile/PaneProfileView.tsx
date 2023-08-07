import type { User } from 'api';
import clsx from 'clsx';
import type { FC } from 'react';
import { Avatar } from '../account/Avatar';
import { ShowUsername } from './ShowUsername';

interface Props {
  user: User;
}

export const PaneProfileView: FC<Props> = ({ user }) => {
  return (
    <div className="p-4">
      <div className="">
        <Avatar
          id={user.id}
          avatarId={user.avatarId}
          name={user.nickname}
          size="6rem"
          className={clsx(
            'rounded-md @xs:float-right',
          )}
        />
        <div className="">
          <ShowUsername username={user.username} />
          <div className="text-xl py-2 whitespace-nowrap overflow-hidden text-ellipsis pr-2">{user.nickname}</div>
          {user.bio !== '' && (
            <div className="whitespace-pre-line max-w-md">
              {user.bio}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
