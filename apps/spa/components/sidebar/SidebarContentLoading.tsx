import { FC } from 'react';
import { LoadingText } from '@boluo/ui/LoadingText';

export const SidebarContentLoading: FC = () => {
  return (
    <div className="text-text-lighter flex items-center px-4 py-4">
      <LoadingText />
    </div>
  );
};
