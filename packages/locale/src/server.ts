import { createIntl, type IntlShape } from '@formatjs/intl';
import { onIntlError, toLocale } from '.';
import { loadMessages } from './dynamic';

export const getIntl = async ({ lang }: { lang: string }): Promise<IntlShape> => {
  const locale = toLocale(lang);
  const messages = await loadMessages(locale);
  return createIntl({ locale, messages, onError: onIntlError });
};
