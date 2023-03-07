import { store } from 'common/store';
import { Provider as JotaiProvider } from 'jotai';
import zhCn from 'lang/compiled/zh_CN.json';
import { ReactNode, Suspense } from 'react';
import { IntlProvider } from 'react-intl';
import { SWRConfig } from 'swr';

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
        <IntlProvider locale={'zh'} messages={zhCn}>
          <Suspense fallback={'loading'}>{children}</Suspense>
        </IntlProvider>
      </SWRConfig>
    </JotaiProvider>
  );
}
