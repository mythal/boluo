import { IntlConfig, IntlErrorCode, type OnErrorFn } from '@formatjs/intl';
import type { Locale } from '@boluo/types';

export type IntlMessages = IntlConfig['messages'];
export const LOCALES: Locale[] = ['en', 'ja', 'zh-CN', 'zh-TW'] as const;
export const defaultLocale = 'en';

export const narrowLocale = (locale: string): Locale | null => {
  locale = locale.toLowerCase();
  if (locale === 'zh-tw' || locale === 'zh-hant') {
    return 'zh-TW';
  } else if (locale === 'zh' || locale.startsWith('zh-')) {
    return 'zh-CN';
  } else if (locale === 'ja') {
    return 'ja';
  } else if (locale === 'en' || locale.startsWith('en-')) {
    return 'en';
  } else {
    return null;
  }
};

export const toLocale = (data: unknown): Locale => {
  if (typeof data !== 'string') {
    return 'en';
  }
  const locale = data.trim().toLocaleLowerCase();
  return narrowLocale(locale) ?? 'en';
};

export const onIntlError: OnErrorFn = (e) => {
  if (e.code === IntlErrorCode.MISSING_TRANSLATION) {
    if (typeof window === 'undefined' /* SSR */) {
      // do noting
    } else {
      console.debug('Missing Translation: ', e.message);
    }
  } else {
    console.error(e);
  }
};
