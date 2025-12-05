import { useAtomValue } from 'jotai';
import React, { type FC, useMemo, useState } from 'react';
import { Suspense } from 'react';
import { isChatInitializedAtom } from '../../state/chat.atoms';
import { ChatListLoading } from './ChatContentLoading';
import { IsScrollingContext } from '../../hooks/useIsScrolling';
import { ChatContentErrorBoundry } from './ChatContentErrorBoundry';

const ChatContentView = React.lazy(() => import('./ChatContentView'));

interface Props {
  currentUserId?: string | undefined | null;
}

export const ChatContent: FC<Props> = ({ currentUserId }) => {
  const loading = <ChatListLoading />;
  const initialized = useAtomValue(isChatInitializedAtom);
  const [isScrolling, setIsScrolling] = useState(false);
  const view = useMemo(
    () => (
      <ChatContentErrorBoundry>
        <ChatContentView setIsScrolling={setIsScrolling} currentUserId={currentUserId} />
      </ChatContentErrorBoundry>
    ),
    [currentUserId],
  );
  if (!initialized) return loading;
  return (
    <Suspense fallback={loading}>
      <IsScrollingContext value={isScrolling}>{view}</IsScrollingContext>
    </Suspense>
  );
};
