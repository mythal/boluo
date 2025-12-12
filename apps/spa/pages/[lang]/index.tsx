/* eslint-disable @next/next/no-page-custom-font */
import { type IntlMessages, LOCALES, toLocale } from '@boluo/locale';
import { loadMessages } from '@boluo/locale/dynamic';
import { ClientProviders } from '../../components/ClientProviders';
import { type GetStaticPaths } from 'next';
import type { Locale } from '@boluo/types';
import Head from 'next/head';
import { useIntl } from 'react-intl';
import { useEffect } from 'react';
import Chat from '../../components/Chat';
import { ChatErrorBoundary } from '../../components/ChatErrorBoundary';
import { UnsupportedBrowser } from '@boluo/ui/UnsupportedBrowser';
import { useDetectBrowserSupport } from '@boluo/common/hooks/useDetectBrowserSupport';
import { getOS } from '@boluo/utils/browser';
import { useQueryAppSettings } from '@boluo/common/hooks/useQueryAppSettings';

export const getStaticPaths = (() => {
  return {
    paths: LOCALES.map((lang) => ({ params: { lang } })),
    fallback: false,
  };
}) satisfies GetStaticPaths;

interface Props {
  lang: Locale;
  messages: IntlMessages;
}
export const getStaticProps = async (context: {
  params: { lang: string };
}): Promise<{ props: Props }> => {
  const lang = toLocale(context.params.lang);
  const messages = await loadMessages(lang);
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
        content={intl.formatMessage({
          defaultMessage: 'A chat application designed specifically for playing RPGs.',
        })}
      />
      <meta name="application-name" content={intl.formatMessage({ defaultMessage: 'Boluo' })} />
      <link rel="manifest" href={`/${intl.locale}.webmanifest`} />
      <link rel="apple-touch-icon" href="/icons/app-180px.png"></link>
      {LOCALES.map((locale) => (
        <link key={locale} rel="alternate" hrefLang={locale} href={`/${locale}`} />
      ))}
    </Head>
  );
};

export default function Page({ lang, messages }: Props) {
  const isSupportedBrowser = useDetectBrowserSupport();
  const { data: appSettings } = useQueryAppSettings();
  return (
    <ClientProviders lang={lang} messages={messages}>
      <PageHead />
      <ChatErrorBoundary>
        {isSupportedBrowser ? (
          <Chat />
        ) : (
          <UnsupportedBrowser isIos={getOS() === 'iOS'} siteUrl={appSettings?.siteUrl} />
        )}
      </ChatErrorBoundary>
    </ClientProviders>
  );
}
