import 'server-only';
import type { IntlShape } from '@formatjs/intl';
import { IntlErrorCode, createIntl } from '@formatjs/intl';
import { defaultLocale, localeList, toLocale } from '@boluo/common/locale';
import type { IntlMessages, Locale } from '@boluo/common/locale';
import en from '@boluo/lang/compiled/en.json';
import ja from '@boluo/lang/compiled/ja_JP.json';
import zh_CN from '@boluo/lang/compiled/zh_CN.json';
import { cookies, headers } from 'next/headers';
import { cache } from 'react';
import { toTheme } from '@boluo/theme';
import type { Theme } from '@boluo/theme';

export interface LangParams {
  lang?: string;
}

const getLocaleFromAcceptLanguage = (): Locale => {
  // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Language
  const acceptLanguage = headers().get('Accept-Language');
  if (acceptLanguage === null) {
    return defaultLocale;
  }
  const languages = acceptLanguage.split(',');
  for (const language of languages) {
    for (const locale of localeList) {
      if (language.trim().startsWith(locale)) {
        return locale;
      }
    }
  }
  return defaultLocale;
};

export const getLocaleFromHeaders = cache((): Locale => {
  const cookieLocale = cookies().get('LANG')?.value;
  if (!cookieLocale) {
    return getLocaleFromAcceptLanguage();
  }
  return toLocale(cookieLocale);
});

// eslint-disable-next-line @typescript-eslint/require-await
export const getLocale = cache(async (): Promise<Locale> => {
  return getLocaleFromHeaders();
});

export const getThemeFromHeaders = cache((): Theme => {
  const cookieTheme = cookies().get('boluo-theme')?.value;
  if (!cookieTheme) {
    return 'system';
  }
  return toTheme(cookieTheme);
});

// eslint-disable-next-line @typescript-eslint/require-await
export const getTheme = cache(async (): Promise<Theme> => {
  return getThemeFromHeaders();
});

export const getMessages = (locale: Locale): IntlMessages => {
  switch (locale) {
    case 'en':
      return en;
    case 'ja':
      return ja;
    case 'zh-CN':
      return zh_CN;
  }
};

export const getIntl = ({ lang }: LangParams): IntlShape<string> => {
  const locale = toLocale(lang);
  const messages = getMessages(locale);
  return createIntl({
    locale,
    messages,
    onError: (err) => {
      if (err.code === IntlErrorCode.MISSING_TRANSLATION) {
        console.debug(err.message.trim());
      } else {
        console.error(err);
      }
    },
  });
};

export const title = (intl: IntlShape<string>, prefix: string): string => {
  return prefix + ' - ' + intl.formatMessage({ defaultMessage: 'Boluo' });
};
