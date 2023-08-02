import type { GetMe } from 'api';
import { useAtomValue } from 'jotai';
import React, { FC } from 'react';
import { Suspense } from 'react';
import { useMyChannelMember } from '../../hooks/useMyChannelMember';
import { isChatInitializedAtom } from '../../state/chat.atoms';
import { ChatListLoading } from './ChatContentLoading';

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
  if (!initialized) return loading;
  return (
    <Suspense fallback={loading}>
      <ChatContentView className={className} me={me} myMember={member} />
    </Suspense>
  );
};
