import type { FC } from 'react';
import { Loading } from 'ui/Loading';

export const ChatListLoading: FC = () => {
  return (
    <div className="w-full h-full">
      <Loading />
    </div>
  );
};
