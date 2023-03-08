import { MeProvider } from 'common';
import { store } from 'common/store';
import { Provider as JotaiProvider } from 'jotai';
import en from 'lang/compiled/en.json';
import zhCn from 'lang/compiled/zh_CN.json';
import { ReactNode, Suspense } from 'react';
import { IntlProvider } from 'react-intl';
import { SWRConfig } from 'swr';
import { ChatSkeleton } from './ChatSkeleton';

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
        <IntlProvider locale={'en'} messages={en}>
          <Suspense fallback={<ChatSkeleton>Loading...</ChatSkeleton>}>
            <MeProvider>
              {children}
            </MeProvider>
          </Suspense>
        </IntlProvider>
      </SWRConfig>
    </JotaiProvider>
  );
}
