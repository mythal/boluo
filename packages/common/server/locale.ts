// import 'server-only';
import { toLocale, type IntlMessages, type Locale } from '../locale';

import en from '@boluo/lang/en.json' with { type: 'json' };
import ja from '@boluo/lang/ja_JP.json' with { type: 'json' };
import zh_CN from '@boluo/lang/zh_CN.json' with { type: 'json' };
import zh_TW from '@boluo/lang/zh_TW.json' with { type: 'json' };
import { IntlErrorCode } from '@formatjs/intl';
import { createIntl, IntlShape } from 'react-intl';

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

export const getIntl = ({ lang }: { lang: string }): IntlShape => {
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
