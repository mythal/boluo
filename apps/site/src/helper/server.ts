import 'server-only';
import type { IntlShape } from '@formatjs/intl';
import { createIntl } from '@formatjs/intl';
import type { GetMe } from 'boluo-api';
import en from 'lang/compiled/en.json';
import ja from 'lang/compiled/ja_JP.json';
import zh_CN from 'lang/compiled/zh_CN.json';
import { cookies, headers } from 'next/headers';
import { cache } from 'react';
import type { Theme } from 'ui';
import { toTheme } from 'ui/theme';
import { get } from '../api/server';
import type { IntlMessages, Locale } from '../locale';
import { defaultLocale } from '../locale';
import { localeList } from '../locale';
import { toLocale } from '../locale';
import { toSettings } from '../settings';

export const getMe = cache(async (): Promise<GetMe | null> => {
  return (await get('/users/get_me', null)).unwrapOr(null);
});

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

export const getLocale = cache(async (): Promise<Locale> => {
  const me = await getMe();
  if (me) {
    const settings = toSettings(me.settings);
    if (settings.locale) {
      return settings.locale;
    }
  }
  return getLocaleFromHeaders();
});

export const getThemeFromHeaders = cache((): Theme => {
  const cookieTheme = cookies().get('BOLUO_THEME')?.value;
  if (!cookieTheme) {
    return 'system';
  }
  return toTheme(cookieTheme);
});

export const getTheme = cache(async (): Promise<Theme> => {
  const me = await getMe();
  if (me) {
    const settings = toSettings(me.settings);
    if (settings.theme) {
      return settings.theme;
    }
  }
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

export const getIntl = cache(async (): Promise<IntlShape<string>> => {
  const locale = await getLocale();
  const messages = getMessages(locale);
  return createIntl({
    locale,
    messages,
  });
});

export const getIntlSync = (): IntlShape<string> => {
  const locale = getLocaleFromHeaders();
  const messages = getMessages(locale);
  return createIntl({
    locale,
    messages,
  });
};

export const title = (intl: IntlShape<string>, prefix: string): string => {
  return prefix + ' - ' + intl.formatMessage({ defaultMessage: 'Boluo' });
};
