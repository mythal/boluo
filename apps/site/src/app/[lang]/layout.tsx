import type { ReactNode } from 'react';
import 'ui/tailwind.css';
import { Locale } from 'common/locale';
import { Metadata } from 'next';
import { ClientProviders } from '../../components/global/Providers';
import { getIntl, getMessages, LangParams } from '../../server';

export function generateMetadata(
  { params }: { params: LangParams },
): Metadata {
  const intl = getIntl(params);
  const title = intl.formatMessage({ defaultMessage: 'Boluo' });

  return {
    title,
    colorScheme: 'dark light',
  };
}

export default function RootLayout({
  children,
  params: { lang },
}: {
  children: ReactNode;
  params: { lang: Locale };
}) {
  const messages = getMessages(lang);
  const theme = 'light';

  return (
    <html lang={lang} className={theme}>
      <body className="bg-bg text-text">
        <ClientProviders locale={lang} messages={messages} me={null}>
          {children}
          <div id="portal" />
        </ClientProviders>
      </body>
    </html>
  );
}

export function generateStaticParams() {
  return [{ lang: 'zh-CN' }, { lang: 'ja' }, { lang: 'en' }];
}