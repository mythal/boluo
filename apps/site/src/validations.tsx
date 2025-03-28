import { get } from '@boluo/api-browser';
import type { IntlShape } from 'react-intl';

export const required = (intl: IntlShape) => ({
  required: intl.formatMessage({ defaultMessage: "Can't be empty." }),
});

export const minLength = (min: number) => (intl: IntlShape) => ({
  minLength: {
    value: min,
    message: intl.formatMessage({ defaultMessage: 'Must be at least {min} characters.' }, { min }),
  },
});

export const maxLength = (max: number) => (intl: IntlShape) => ({
  maxLength: {
    value: max,
    message: intl.formatMessage({ defaultMessage: 'Must be at most {max} characters.' }, { max }),
  },
});

// TODO: handle spaces
export const nickname = (intl: IntlShape) => {
  return {
    ...required(intl),
    ...minLength(3)(intl),
    ...maxLength(32)(intl),
  };
};

export const username = (intl: IntlShape) => ({
  ...required(intl),
  pattern: {
    value: /^[\w_\d]+$/,
    message: intl.formatMessage({
      defaultMessage: 'Only letters, numbers, and underscores are allowed.',
    }),
  },
  ...minLength(3),
  ...maxLength(32),

  validate: async (username: string) => {
    const result = await get('/users/check_username', { username });
    if (!result.isOk) {
      console.warn(result);
    } else if (result.some) {
      return intl.formatMessage({ defaultMessage: 'This username is already taken.' });
    }
    return true;
  },
});

export const email = (intl: IntlShape) => ({
  ...required(intl),
  ...minLength(2)(intl),
  ...maxLength(254)(intl),
  pattern: {
    // https://emailregex.com/
    value: /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/,
    message: intl.formatMessage({ defaultMessage: 'Must be a valid email address.' }),
  },
  validate: async (email: string) => {
    const result = await get('/users/check_email', { email });
    if (!result.isOk) {
      console.warn(result.err);
    } else if (result.some) {
      return intl.formatMessage({ defaultMessage: 'This email is already in use.' });
    }
    return true;
  },
});

export const password = (intl: IntlShape) => ({
  ...required(intl),
  ...minLength(8)(intl),
  ...maxLength(521)(intl),
});
