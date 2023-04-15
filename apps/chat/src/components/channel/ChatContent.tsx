import type { GetMe } from 'api';
import type { FC } from 'react';
import { Suspense } from 'react';
import { useChatList } from '../../hooks/useChatList';
import { useMyChannelMember } from '../../hooks/useMyChannelMember';
import { ChatListLoading } from './ChatContentLoading';
import { ChatContentView } from './ChatContentView';

interface Props {
  className: string;
  channelId: string;
  me: GetMe | null;
}

export const ChatContent: FC<Props> = ({ className, me, channelId }) => {
  const chatList = useChatList(channelId);
  const loading = <ChatListLoading />;
  const member = useMyChannelMember(channelId);
  if (chatList === undefined) return loading;
  return (
    <Suspense fallback={loading}>
      <ChatContentView className={className} chatList={chatList} me={me} myMember={member} />
    </Suspense>
  );
};
