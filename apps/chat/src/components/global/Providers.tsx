import { MeProvider } from 'common';
import { Provider as JotaiProvider } from 'jotai';
import { ReactNode, Suspense } from 'react';
import { store } from 'store';
import { SWRConfig } from 'swr';
import { ChatSkeleton } from '../ChatSkeleton';
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
          suspense: true,
        }}
      >
        <Suspense fallback={<ChatSkeleton placeholder="Loading..." />}>
          <LocaleProvider>
            <MeProvider>
              {children}
            </MeProvider>
          </LocaleProvider>
        </Suspense>
      </SWRConfig>
    </JotaiProvider>
  );
}
