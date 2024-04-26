import { ReactNode } from 'react';
import type { Locale } from '@boluo/common/locale';
import { getMessages } from '@boluo/common/server';
import { ClientProviders } from './ClientProviders';

interface Props {
  lang: Locale;
  children: ReactNode;
}

export function Providers({ children, lang }: Props) {
  const messages = getMessages(lang);
  return (
    <ClientProviders lang={lang} messages={messages}>
      {children}
    </ClientProviders>
  );
}
