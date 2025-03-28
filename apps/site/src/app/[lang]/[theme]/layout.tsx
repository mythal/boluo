import { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { ClientProviders } from '../../../components/global/Providers';
import '@boluo/ui/tailwind.css';
import { getIntl, loadMessages, LOCALES, toLocale } from '@boluo/common/locale';
import { toTheme } from '@boluo/theme';
import { Params } from '../../../server';

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const intl = await getIntl(await params);
  const title = intl.formatMessage({ defaultMessage: 'Boluo' });

  return {
    title,
    description: intl.formatMessage({
      defaultMessage: 'A chat application designed specifically for playing RPGs.',
    }),
  };
}

export async function generateViewport({ params }: { params: Promise<Params> }): Promise<Viewport> {
  const { theme } = await params;
  let colorScheme: Viewport['colorScheme'] = 'dark light';
  if (theme === 'theme:dark') {
    colorScheme = 'dark';
  }
  if (theme === 'theme:light') {
    colorScheme = 'light';
  }
  return {
    colorScheme,
  };
}

export default async function RootLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<Params>;
}) {
  const { lang, theme: themeParam = 'theme:system' } = await params;
  const theme = toTheme(themeParam);
  const locale = toLocale(lang);

  const messages = await loadMessages(locale);
  return (
    <html lang={locale} className={theme}>
      <body className="bg-bg text-text-base">
        <ClientProviders locale={locale} messages={messages}>
          <div className="p-4 md:container md:mx-auto md:p-8">{children}</div>
          <div id="portal" />
        </ClientProviders>
      </body>
    </html>
  );
}
// export const dynamic = 'error';

export function generateStaticParams() {
  const params: Array<{ lang: string; theme: string }> = [];
  for (const lang of LOCALES) {
    params.push({ lang, theme: 'theme:light' });
    params.push({ lang, theme: 'theme:dark' });
    params.push({ lang, theme: 'theme:system' });
  }
  return params;
}
