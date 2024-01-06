import type { FC } from 'react';
import { Loading } from 'ui/Loading';

export const ChatListLoading: FC = () => {
  return (
    <div className="h-full w-full">
      <Loading />
    </div>
  );
};
