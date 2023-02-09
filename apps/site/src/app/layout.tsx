import type { ReactNode } from 'react';
import 'ui/tailwind.css';
import { ClientProviders } from '../components/global/Providers';
import { getLocale, getMe, getMessages, getTheme } from '../helper/server';

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
