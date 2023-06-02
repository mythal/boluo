import { FC } from 'react';

export const ShowUsername: FC<{ username: string }> = ({ username }) => {
  return <div className="text-surface-500 py-1">{username}</div>;
};
