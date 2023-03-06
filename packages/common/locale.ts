import type { IntlConfig } from 'react-intl';

export type IntlMessages = IntlConfig['messages'];
export type Locale = 'en' | 'ja' | 'zh-CN';
export const localeList: Locale[] = ['en', 'ja', 'zh-CN'];
export const defaultLocale = 'en';
export const loadMessages = async (locale: Locale): Promise<IntlMessages> => {
  switch (locale) {
    case 'en':
      return (await import('lang/compiled/en.json')).default;
    case 'ja':
      return (await import('lang/compiled/ja_JP.json')).default;
    case 'zh-CN':
      return (await import('lang/compiled/zh_CN.json')).default;
  }
};

export const toLocale = (data: unknown): Locale => {
  if (typeof data !== 'string') {
    return 'en';
  } else if (data.startsWith('zh')) {
    return 'zh-CN';
  } else if (data.startsWith('ja')) {
    return 'ja';
  } else {
    return 'en';
  }
};
