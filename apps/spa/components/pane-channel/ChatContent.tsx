import type { User } from '@boluo/api';
import { useAtomValue } from 'jotai';
import React, { FC, useMemo, useState } from 'react';
import { Suspense } from 'react';
import { useMyChannelMember } from '../../hooks/useMyChannelMember';
import { isChatInitializedAtom } from '../../state/chat.atoms';
import { ChatListLoading } from './ChatContentLoading';
import { IsScrollingContext } from '../../hooks/useIsScrolling';
import { ChatContentErrorBoundry } from './ChatContentErrorBoundry';

const ChatContentView = React.lazy(() => import('./ChatContentView'));

interface Props {
  className: string;
  channelId: string;
  currentUser: User | null | undefined;
}

export const ChatContent: FC<Props> = ({ className, currentUser, channelId }) => {
  const loading = <ChatListLoading />;
  const member = useMyChannelMember(channelId);
  const initialized = useAtomValue(isChatInitializedAtom);
  const [isScrolling, setIsScrolling] = useState(false);
  const view = useMemo(
    () => (
      <ChatContentErrorBoundry>
        <ChatContentView
          setIsScrolling={setIsScrolling}
          className={className}
          currentUser={currentUser}
          myMember={member}
        />
      </ChatContentErrorBoundry>
    ),
    [className, currentUser, member],
  );
  if (!initialized) return loading;
  return (
    <Suspense fallback={loading}>
      <IsScrollingContext.Provider value={isScrolling}>{view}</IsScrollingContext.Provider>
    </Suspense>
  );
};
