import { useMemo } from 'react';
import { PaneList } from './PaneList';

export const ChatNotFound = () => {
  const defaultPane = useMemo(() => {
    return (
      <div className="ChatNotFound flex h-full w-full items-center justify-center">Not found</div>
    );
  }, []);
  return <PaneList defaultPane={defaultPane} />;
};
