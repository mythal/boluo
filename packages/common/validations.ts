import { get } from '@boluo/api-browser';
import type { RegisterOptions } from 'react-hook-form';
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

export const nickname = (intl: IntlShape) =>
  ({
    ...required(intl),
    ...minLength(3)(intl),
    ...maxLength(32)(intl),
  }) satisfies RegisterOptions;

export const spaceName = (intl: IntlShape) =>
  ({
    ...required(intl),
    ...minLength(2)(intl),
    ...maxLength(32)(intl),
  }) satisfies RegisterOptions;

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

export const channelNameValidation = (intl: IntlShape, spaceId?: string, currentName?: string) => ({
  required: intl.formatMessage({ defaultMessage: 'Channel name is required.' }),
  maxLength: {
    value: 32,
    message: intl.formatMessage({ defaultMessage: 'Channel name must be at most 32 characters.' }),
  },
  validate: async (name: string) => {
    const striped = name.replace(/\s/g, '');
    if (striped.length === 0) {
      return intl.formatMessage({ defaultMessage: 'Channel name cannot be empty.' });
    } else if (striped.length < 2) {
      return intl.formatMessage({ defaultMessage: 'Channel name must be at least 2 characters.' });
    }
    if (!spaceId) {
      return;
    }
    if (currentName !== name) {
      const result = await get('/channels/check_name', { spaceId, name });
      if (!result.isOk) {
        console.warn(result.err);
      } else if (result.some) {
        return intl.formatMessage({ defaultMessage: 'This channel name is already taken.' });
      }
    }
  },
});
