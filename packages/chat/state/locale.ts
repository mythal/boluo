import { Locale } from 'common';
import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export const localeAtom = atomWithStorage<Locale>('BOLUO_LOCALE_V1', 'en');

export const messagesAtom = atom((get) => {
  const locale = get(localeAtom);
  switch (locale) {
    case 'ja':
      return import('lang/compiled/ja_JP.json');
    case 'zh-CN':
      return import('lang/compiled/zh_CN.json');
    default:
      return import('lang/compiled/en.json');
  }
});
