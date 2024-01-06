import { ChatSkeleton } from 'chat/components/ChatSkeleton';
import { Provider as JotaiProvider } from 'jotai';
import { ReactNode, Suspense } from 'react';
import { store } from 'store';
import { SWRConfig } from 'swr';
import { LocaleProvider } from './LocaleProvider';

interface Props {
  children: ReactNode;
}

export function Providers({ children }: Props) {
  return (
    <JotaiProvider store={store}>
      <SWRConfig
        value={{
          refreshInterval: 60000,
        }}
      >
        <Suspense fallback={<ChatSkeleton placeholder="Loading..." />}>
          <LocaleProvider>{children}</LocaleProvider>
        </Suspense>
      </SWRConfig>
    </JotaiProvider>
  );
}
