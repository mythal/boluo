import { Locale } from '@boluo/common/locale';
import { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { ClientProviders } from '../../components/global/Providers';
import { getIntl, getMessages, LangParams } from '@boluo/common/server';
import '@boluo/ui/tailwind.css';

export function generateMetadata({ params }: { params: LangParams }): Metadata {
  const intl = getIntl(params);
  const title = intl.formatMessage({ defaultMessage: 'Boluo' });

  return {
    title,
    description: intl.formatMessage({ defaultMessage: 'A chat application designed specifically for playing RPGs.' }),
  };
}

export const viewport: Viewport = {
  colorScheme: 'dark light',
};

export default function RootLayout({ children, params: { lang } }: { children: ReactNode; params: { lang: Locale } }) {
  const messages = getMessages(lang);
  const theme = 'light';

  return (
    <html lang={lang} className={theme}>
      <body className="bg-bg text-text-base">
        <ClientProviders locale={lang} messages={messages}>
          <div className="p-4 md:container md:mx-auto md:p-8">{children}</div>
          <div id="portal" />
        </ClientProviders>
      </body>
    </html>
  );
}

export function generateStaticParams() {
  return [{ lang: 'zh-CN' }, { lang: 'ja' }, { lang: 'en' }];
}
