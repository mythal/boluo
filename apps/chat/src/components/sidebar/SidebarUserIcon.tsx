import clsx from 'clsx';
import { useMe } from 'common';
import { FC } from 'react';
import { Avatar } from '../account/Avatar';

interface Props {
  onClick: () => void;
}

export const SidebarUserIcon: FC<Props> = ({ onClick }) => {
  const me = useMe();
  if (!me) {
    return null;
  }
  return (
    <button type="button" onClick={onClick}>
      <Avatar
        size={32}
        id={me.user.id}
        name={me.user.nickname}
        avatarId={me.user.avatarId}
        className={clsx('w-8 h-8 rounded border cursor-pointer', 'border-surface-400')}
      />
    </button>
  );
};
