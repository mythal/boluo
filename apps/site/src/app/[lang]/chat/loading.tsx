import { ChatSkeleton } from '@boluo/chat/components/ChatSkeleton';
import { Loading as LoadingUi } from '@boluo/ui/Loading';

export default function Loading() {
  return (
    <ChatSkeleton>
      <LoadingUi />
    </ChatSkeleton>
  );
}
