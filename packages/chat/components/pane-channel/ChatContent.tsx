import type { GetMe } from '@boluo/api';
import { useAtomValue } from 'jotai';
import React, { FC, useMemo, useState } from 'react';
import { Suspense } from 'react';
import { useMyChannelMember } from '../../hooks/useMyChannelMember';
import { isChatInitializedAtom } from '../../state/chat.atoms';
import { ChatListLoading } from './ChatContentLoading';
import { IsScrollingContext } from '../../hooks/useIsScrolling';

const ChatContentView = React.lazy(() => import('./ChatContentView'));

interface Props {
  className: string;
  channelId: string;
  me: GetMe | 'LOADING' | null;
}

export const ChatContent: FC<Props> = ({ className, me, channelId }) => {
  const loading = <ChatListLoading />;
  const member = useMyChannelMember(channelId);
  const initialized = useAtomValue(isChatInitializedAtom);
  const [isScrolling, setIsScrolling] = useState(false);
  const view = useMemo(
    () => <ChatContentView setIsScrolling={setIsScrolling} className={className} me={me} myMember={member} />,
    [className, me, member],
  );
  if (!initialized) return loading;
  return (
    <Suspense fallback={loading}>
      <IsScrollingContext.Provider value={isScrolling}>{view}</IsScrollingContext.Provider>
    </Suspense>
  );
};
