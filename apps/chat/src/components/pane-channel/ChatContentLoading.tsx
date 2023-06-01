import type { FC } from 'react';
import { Loading } from 'ui';

export const ChatListLoading: FC = () => {
  return (
    <div className="w-full h-full">
      <Loading />
    </div>
  );
};
