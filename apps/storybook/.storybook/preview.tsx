import type { Preview } from '@storybook/react-vite';
import '@boluo/tailwind-config';
import { defaultLocale, LOCALES, onIntlError, type IntlMessages } from '@boluo/locale';
import { CONCRETE_THEMES } from '@boluo/theme';
import en from '@boluo/lang/en.json';
import ja from '@boluo/lang/ja_JP.json';
import zhCN from '@boluo/lang/zh_CN.json';
import zhTW from '@boluo/lang/zh_TW.json';
import { IntlProvider } from 'react-intl';
import { withThemeByDataAttribute } from '@storybook/addon-themes';
import React, { useEffect, useState } from 'react';
import { DecoratorFunction } from 'storybook/internal/types';
import type { Locale } from '@boluo/types';

const preview: Preview = {
  parameters: {
    layout: 'centered',
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
  },
  globalTypes: {
    locale: {
      name: 'Locale',
      description: 'Locale applied to all stories',
      defaultValue: defaultLocale,
      toolbar: {
        icon: 'globe',
        items: [
          { value: 'en', title: 'English' },
          { value: 'ja', title: 'Japanese' },
          { value: 'zh-CN', title: 'Chinese (Simplified)' },
          { value: 'zh-TW', title: 'Chinese (Traditional)' },
        ],
      },
    },
  },
};

const messagesCache: Partial<Record<Locale, IntlMessages>> = {};
const fallbackMessages = {} as IntlMessages;

// eslint-disable-next-line react-refresh/only-export-components
const LocaleProviderWrapper: React.FC<{
  locale: Locale;
  children: React.ReactNode;
}> = ({ locale, children }) => {
  const [messages, setMessages] = useState<IntlMessages | undefined>(messagesCache[locale]);
  const [isLoading, setIsLoading] = useState(messagesCache[locale] == null);

  useEffect(() => {
    let cancelled = false;

    const resolveMessages = async () => {
      try {
        const cached = messagesCache[locale];
        if (cached != null) {
          if (!cancelled) {
            setMessages(cached);
            setIsLoading(false);
          }
          return;
        }
        setIsLoading(true);
        switch (locale) {
          case 'en':
            messagesCache.en = en as IntlMessages;
            break;
          case 'ja':
            messagesCache.ja = ja as IntlMessages;
            break;
          case 'zh-CN':
            messagesCache['zh-CN'] = zhCN as IntlMessages;
            break;
          case 'zh-TW':
            messagesCache['zh-TW'] = zhTW as IntlMessages;
            break;
          default: {
            throw new Error(`Unsupported locale: ${locale}`);
          }
        }
        if (!cancelled) {
          setMessages(messagesCache[locale]);
          setIsLoading(false);
        }
      } catch (error) {
        console.error(`Failed to load messages for locale "${locale}".`, error);
        if (!cancelled) {
          setMessages(undefined);
          setIsLoading(false);
        }
      }
    };

    void resolveMessages();

    return () => {
      cancelled = true;
    };
  }, [locale]);

  if (isLoading && messages == null) {
    return <div style={{ padding: '1rem', fontSize: '0.875rem' }}>Loading translations...</div>;
  }

  return (
    <IntlProvider
      key={locale}
      locale={locale}
      messages={messages ?? fallbackMessages}
      defaultLocale={defaultLocale}
      onError={onIntlError}
    >
      {children}
    </IntlProvider>
  );
};

const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && LOCALES.includes(value as Locale);

const withLocale: DecoratorFunction = (Story, context) => {
  const requested = context.globals.locale;
  const locale = isLocale(requested) ? requested : defaultLocale;

  return (
    <LocaleProviderWrapper locale={locale}>
      <Story />
    </LocaleProviderWrapper>
  );
};

export const decorators = [
  withThemeByDataAttribute({
    themes: Object.fromEntries(CONCRETE_THEMES.map((theme) => [theme, theme])),
    defaultTheme: 'light',
  }),
  withLocale,
];
export default preview;
