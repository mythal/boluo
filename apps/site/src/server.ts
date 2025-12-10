import { type IntlShape } from 'react-intl';

export interface Params {
  lang: string;
  theme: string;
}

export const title = (intl: IntlShape, prefix: string): string => {
  return prefix + ' - ' + intl.formatMessage({ defaultMessage: 'Boluo' });
};
