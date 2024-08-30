import { type IntlMessages, localeList, toLocale } from '@boluo/common/locale';
import { ClientProviders } from '../../components/ClientProviders';
import { type GetStaticPaths } from 'next';
import { getMessages } from '@boluo/common/server/get-messages';
import { type Locale } from '@boluo/common';
import Head from 'next/head';
import { useIntl } from 'react-intl';
import { useEffect } from 'react';
import '@boluo/ui/tailwind.css';
import Chat from '../../components/Chat';
import { ChatErrorBoundary } from '../../components/ChatErrorBoundary';
import { UnsupportedBrowser } from '../../components/UnsupportedBrowser';
import { useDetectBrowserSupport } from '../../hooks/useDetectBrowserSupport';

export const getStaticPaths = (() => {
  return {
    paths: localeList.map((lang) => ({ params: { lang } })),
    fallback: false,
  };
}) satisfies GetStaticPaths;

interface Props {
  lang: Locale;
  messages: IntlMessages;
}
export const getStaticProps = (context: { params: { lang: string } }): { props: Props } => {
  const lang = toLocale(context.params.lang);
  const messages = getMessages(lang);
  return { props: { lang, messages: messages } };
};

const PageHead = () => {
  const intl = useIntl();
  useEffect(() => {
    document.documentElement.lang = intl.locale;
  }, [intl.locale]);
  return (
    <Head>
      <title>{intl.formatMessage({ defaultMessage: 'Boluo' })}</title>
      <link rel="icon" href="/favicon.ico" type="image/x-icon" />
      <meta
        name="description"
        content={intl.formatMessage({ defaultMessage: 'A chat application designed specifically for playing RPGs.' })}
      />
      <meta name="application-name" content={intl.formatMessage({ defaultMessage: 'Boluo' })} />
      <link rel="manifest" href={`/${intl.locale}.webmanifest`} />
      <link rel="apple-touch-icon" href="/icons/app-180px.png"></link>

      {localeList.map((locale) => (
        <link key={locale} rel="alternate" hrefLang={locale} href={`/${locale}`} />
      ))}
    </Head>
  );
};

export default function Page({ lang, messages }: Props): JSX.Element {
  const isSupportedBrowser = useDetectBrowserSupport();
  return (
    <ClientProviders lang={lang} messages={messages}>
      <PageHead />
      <ChatErrorBoundary>{isSupportedBrowser ? <Chat /> : <UnsupportedBrowser />}</ChatErrorBoundary>
    </ClientProviders>
  );
}
