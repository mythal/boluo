import type { IntlMessages, Locale } from '@boluo/common/locale';

import en from '@boluo/lang/compiled/en.json';
import ja from '@boluo/lang/compiled/ja_JP.json';
import zh_CN from '@boluo/lang/compiled/zh_CN.json';
import zh_TW from '@boluo/lang/compiled/zh_TW.json';

export const getMessages = (locale: Locale): IntlMessages => {
  switch (locale) {
    case 'en':
      return en;
    case 'ja':
      return ja;
    case 'zh-CN':
      return zh_CN;
    case 'zh-TW':
      return zh_TW;
  }
};
