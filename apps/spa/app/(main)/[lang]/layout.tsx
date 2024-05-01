import { localeList, type Locale } from '@boluo/common/locale';
import { Metadata } from 'next';
import { ReactNode } from 'react';
import { Providers } from './Providers';
import '@boluo/ui/tailwind.css';
import { getIntl } from '@boluo/common/server';

interface Params {
  lang: Locale;
}

export function generateMetadata({ params }: { params: Params }): Metadata {
  const intl = getIntl(params);
  const boluo = intl.formatMessage({ defaultMessage: 'Boluo' });
  return {
    title: boluo,
    description: intl.formatMessage({ defaultMessage: 'A chat application designed specifically for playing RPGs.' }),
    applicationName: boluo,
    manifest: `/${params.lang}.webmanifest`,
  };
}

export default function RootLayout({
  children,
  params: { lang },
}: {
  children: ReactNode;
  params: { lang: Locale };
}): JSX.Element {
  return (
    <Providers lang={lang}>
      <html lang={lang} className="bg-bg text-text-base">
        <head>
          {localeList.map((locale) => (
            <link key={locale} rel="alternate" hrefLang={locale} href={`/${locale}`} />
          ))}
        </head>
        <body>{children}</body>
      </html>
    </Providers>
  );
}

export function generateStaticParams() {
  return [{ lang: 'zh-CN' }, { lang: 'ja' }, { lang: 'en' }];
}
