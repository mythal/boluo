import { createContext, useContext } from 'react';
import { useIntl } from 'react-intl';
import { empty } from '@boluo/utils/function';
import { toLocale } from '@boluo/locale';
import { type Locale } from '@boluo/types';

// The process of changing the locale is different in the
// different runtimes. (e.g. tauri, next.js, ...)
// So a Provider is required to change the locale in different
// ways depending on the runtime
export const ChangeLocaleContext = createContext<(locale: Locale) => void>(empty);

export const useLocale = (): [Locale, (locale: Locale) => void] => {
  const intl = useIntl();
  const locale = toLocale(intl.locale);
  const changeLocale = useContext(ChangeLocaleContext);

  return [locale, changeLocale];
};
