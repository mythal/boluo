import { isApiError } from '@boluo/api/errors';
import { type IntlShape } from '@formatjs/intl';

export const explainError = <T>(intl: IntlShape<T>, error: unknown): string => {
  if (isApiError(error)) {
    switch (error.code) {
      case 'BAD_REQUEST':
        return intl.formatMessage({ defaultMessage: 'Malformed request.' });
      case 'METHOD_NOT_ALLOWED':
        return intl.formatMessage({ defaultMessage: 'Wrong request method.' });
      case 'CONFLICT':
        return intl.formatMessage({ defaultMessage: 'There is a resource conflict.' });
      case 'UNEXPECTED':
        return intl.formatMessage({
          defaultMessage: "Oops! Something went wrong, but it wasn't your fault",
        });
      case 'NOT_JSON':
        return intl.formatMessage({
          defaultMessage: 'An error occurred while parsing the data.',
        });
      case 'FETCH_FAIL':
        return intl.formatMessage({
          defaultMessage: 'Request failed, possible network anomaly.',
        });
      case 'NOT_FOUND':
        return intl.formatMessage({ defaultMessage: 'Not found' });
      case 'UNAUTHENTICATED':
        return intl.formatMessage({ defaultMessage: 'Must be logged in.' });
      case 'VALIDATION_FAIL':
        return intl.formatMessage({
          defaultMessage: 'The data submitted did not pass validation.',
        });
      case 'LIMIT_EXCEEDED':
        return intl.formatMessage({ defaultMessage: 'Limit exceeded.' });
      case 'NO_PERMISSION':
        return intl.formatMessage({ defaultMessage: 'No permission.' });
    }
  }

  if (error instanceof Error) {
    return error.message;
  }
  return intl.formatMessage({ defaultMessage: 'An unknown error occurred' });
};
