import { ChatSkeleton } from 'chat/components/ChatSkeleton';
import { Loading as LoadingUi } from 'ui/Loading';

export default function Loading() {
  return (
    <ChatSkeleton>
      <LoadingUi />
    </ChatSkeleton>
  );
}
