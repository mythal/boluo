import { ChatSkeleton } from 'chat/src/components/ChatSkeleton';
import { Loading as LoadingUi } from 'ui/Loading';

export default function Loading() {
  return (
    <ChatSkeleton>
      <LoadingUi />
    </ChatSkeleton>
  );
}
