import { type Metadata, type Viewport } from 'next';
import type { ReactNode } from 'react';
import { ClientProviders } from '../../../components/global/Providers';
import '@boluo/tailwind-config';
import { LOCALES, toLocale } from '@boluo/locale';
import { loadMessages } from '@boluo/locale/dynamic';
import { getIntl } from '@boluo/locale/server';

import { classifyLightOrDark, THEMES, toTheme } from '@boluo/theme';
import { type Params } from '../../../server';

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
  const { theme: themeParam } = await params;
  const theme = toTheme(themeParam);
  let colorScheme: Viewport['colorScheme'] = 'dark light';
  if (theme !== 'system') {
    colorScheme = classifyLightOrDark(theme);
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
      <body className="bg-surface-canvas text-text-primary">
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
    for (const theme of THEMES) {
      params.push({ lang, theme: `theme:${theme}` });
    }
  }
  return params;
}
