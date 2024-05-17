import type { User } from '@boluo/api';
import { useAtomValue } from 'jotai';
import React, { FC, useMemo, useState } from 'react';
import { Suspense } from 'react';
import { isChatInitializedAtom } from '../../state/chat.atoms';
import { ChatListLoading } from './ChatContentLoading';
import { IsScrollingContext } from '../../hooks/useIsScrolling';
import { ChatContentErrorBoundry } from './ChatContentErrorBoundry';

const ChatContentView = React.lazy(() => import('./ChatContentView'));

export const ChatContent: FC = () => {
  const loading = <ChatListLoading />;
  const initialized = useAtomValue(isChatInitializedAtom);
  const [isScrolling, setIsScrolling] = useState(false);
  const view = useMemo(
    () => (
      <ChatContentErrorBoundry>
        <ChatContentView setIsScrolling={setIsScrolling} />
      </ChatContentErrorBoundry>
    ),
    [],
  );
  if (!initialized) return loading;
  return (
    <Suspense fallback={loading}>
      <IsScrollingContext.Provider value={isScrolling}>{view}</IsScrollingContext.Provider>
    </Suspense>
  );
};
