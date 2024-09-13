import { IntlErrorCode, type OnErrorFn } from '@formatjs/intl';
import type { IntlConfig } from 'react-intl';
export type IntlMessages = IntlConfig['messages'];
export type Locale = 'en' | 'ja' | 'zh-CN' | 'zh-TW';
export const localeList: Locale[] = ['en', 'ja', 'zh-CN', 'zh-TW'];
export const defaultLocale = 'en';
export const loadMessages = async (locale: Locale): Promise<IntlMessages> => {
  switch (locale) {
    case 'en':
      return (await import('@boluo/lang/compiled/en.json')).default;
    case 'ja':
      return (await import('@boluo/lang/compiled/ja_JP.json')).default;
    case 'zh-CN':
      return (await import('@boluo/lang/compiled/zh_CN.json')).default;
    case 'zh-TW':
      return (await import('@boluo/lang/compiled/zh_TW.json')).default;
  }
};

export const narrowLocale = (locale: string): Locale | null => {
  if (locale === 'zh-tw') {
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
    throw e;
  }
};
