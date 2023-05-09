import type { ReactNode } from 'react';
import 'ui/tailwind.css';
import { Metadata } from 'next';
import { ClientProviders } from '../components/global/Providers';
import { getIntl, getLocale, getMe, getMessages, getTheme } from '../server';

export async function generateMetadata(): Promise<Metadata> {
  const intl = await getIntl();
  return {
    title: intl.formatMessage({ defaultMessage: 'Boluo ' }),
    colorScheme: 'dark light',
  };
}

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const me = await getMe();
  const locale = await getLocale();
  const messages = getMessages(locale);
  const theme = await getTheme();

  return (
    <html lang={locale} className={theme}>
      <body className="bg-bg text-text">
        <ClientProviders locale={locale} messages={messages} me={me}>
          {children}
          <div id="portal" />
        </ClientProviders>
      </body>
    </html>
  );
}
