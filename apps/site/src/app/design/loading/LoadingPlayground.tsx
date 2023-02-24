import type { FC } from 'react';
import { Loading } from 'ui/Loading';

export const LoadingPlayground: FC = () => {
  return (
    <div className="m-1 p-2 bg-surface-200">
      <div>
        <Loading type="inline" />
      </div>
      <div>
        <Loading />
      </div>
    </div>
  );
};
