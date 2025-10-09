import { type FC } from 'react';

export const ShowUsername: FC<{ username: string }> = ({ username }) => {
  return <div className="text-text-secondary py-1">{username}</div>;
};
