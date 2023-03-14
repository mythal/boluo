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
          className={clsx(
            'h-28 w-28 rounded-md @xs:float-right',
          )}
        />
        <div className="">
          <ShowUsername username={user.username} />
          <div className="text-xl py-2 whitespace-nowrap overflow-hidden text-ellipsis pr-2">{user.nickname}</div>
        </div>
      </div>
    </div>
  );
};
