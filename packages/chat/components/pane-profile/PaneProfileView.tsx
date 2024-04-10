import type { User } from '@boluo/api';
import clsx from 'clsx';
import type { FC } from 'react';
import { Avatar } from '../account/Avatar';
import { ShowUsername } from './ShowUsername';
import { FormattedDate, FormattedMessage } from 'react-intl';

interface Props {
  user: User;
}

export const PaneProfileView: FC<Props> = ({ user }) => {
  return (
    <div className="p-pane">
      <div className="">
        <Avatar
          id={user.id}
          avatarId={user.avatarId}
          name={user.nickname}
          size="6rem"
          className={clsx('@xs:float-right rounded-md')}
        />
        <div className="">
          <ShowUsername username={user.username} />
          <div className="overflow-hidden text-ellipsis whitespace-nowrap py-2 pr-2 text-xl">{user.nickname}</div>
          {user.bio !== '' ? (
            <div className="max-w-md whitespace-pre-line">{user.bio}</div>
          ) : (
            <div className="text-text-lighter text-sm">
              <FormattedMessage defaultMessage="Have not set a bio yet" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
