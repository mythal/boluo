import type { Locale } from '@boluo/types';
import type { IntlMessages } from '.';

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
