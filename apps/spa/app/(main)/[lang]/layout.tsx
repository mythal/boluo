import type { Locale } from '@boluo/common/locale';
import { Metadata } from 'next';
import { ReactNode } from 'react';
import { Providers } from './Providers';
import '@boluo/ui/tailwind.css';

export const metadata: Metadata = {
  title: 'Boluo',
};

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
        <body>{children}</body>
      </html>
    </Providers>
  );
}

export function generateStaticParams() {
  return [{ lang: 'zh-CN' }, { lang: 'ja' }, { lang: 'en' }];
}
