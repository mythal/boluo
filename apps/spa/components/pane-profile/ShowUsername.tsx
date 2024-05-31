import { type FC } from 'react';

export const ShowUsername: FC<{ username: string }> = ({ username }) => {
  return <div className="text-text-light py-1">{username}</div>;
};
