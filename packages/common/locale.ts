import { IntlErrorCode, type OnErrorFn } from '@formatjs/intl';
import { createIntl, type IntlConfig, type IntlShape } from 'react-intl';
export type IntlMessages = IntlConfig['messages'];
export type Locale = 'en' | 'ja' | 'zh-CN' | 'zh-TW';
export const LOCALES: Locale[] = ['en', 'ja', 'zh-CN', 'zh-TW'] as const;
export const defaultLocale = 'en';
export const loadMessages = async (locale: Locale): Promise<IntlMessages> => {
  switch (locale) {
    case 'en':
      return (await import('@boluo/lang/en.json', { with: { type: 'json' } })).default;
    case 'ja':
      return (await import('@boluo/lang/ja_JP.json', { with: { type: 'json' } })).default;
    case 'zh-CN':
      return (await import('@boluo/lang/zh_CN.json', { with: { type: 'json' } })).default;
    case 'zh-TW':
      return (await import('@boluo/lang/zh_TW.json', { with: { type: 'json' } })).default;
  }
};

export const getIntl = async ({ lang }: { lang: string }): Promise<IntlShape> => {
  const locale = toLocale(lang);
  const messages = await loadMessages(locale);
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
