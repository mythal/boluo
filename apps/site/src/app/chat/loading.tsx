import { Loading as LoadingUi } from 'ui/Loading';
import { ChatSkeleton } from './ChatSkeleton';

export default function Loading() {
  return (
    <ChatSkeleton>
      <LoadingUi />
    </ChatSkeleton>
  );
}
