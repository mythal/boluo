import type { FC } from 'react';
import { Loading } from '@boluo/ui/Loading';

export const ChatListLoading: FC = () => {
  return (
    <div className="h-full w-full">
      <Loading />
    </div>
  );
};
