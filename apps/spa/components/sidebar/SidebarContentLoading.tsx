import { FC } from 'react';
import { LoadingText } from '../common/LoadingText';

export const SidebarContentLoading: FC = () => {
  return (
    <div className="text-text-lighter flex items-center px-4 py-4">
      <LoadingText />
    </div>
  );
};
