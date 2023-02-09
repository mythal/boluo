import { isApiError } from 'boluo-api';
import { useIntl } from 'react-intl';

export const useErrorExplain = (error: unknown): string => {
  const intl = useIntl();
  let explain = intl.formatMessage({ defaultMessage: 'Something going wrong.' }); // default

  if (isApiError(error)) {
    if (error.code === 'BAD_REQUEST') {
      explain = intl.formatMessage({ defaultMessage: 'Malformed request.' });
    } else if (error.code === 'METHOD_NOT_ALLOWED') {
      explain = intl.formatMessage({ defaultMessage: 'Wrong request method.' });
    } else if (error.code === 'CONFLICT') {
      explain = intl.formatMessage({ defaultMessage: 'There is a resource conflict.' });
    } else if (error.code === 'UNEXPECTED') {
      explain = intl.formatMessage({ defaultMessage: 'Server Internal Error' });
    } else if (error.code === 'NOT_JSON') {
      explain = intl.formatMessage({ defaultMessage: 'An error occurred while parsing the data.' });
    } else if (error.code === 'FETCH_FAIL') {
      explain = intl.formatMessage({ defaultMessage: 'Request failed, possible network anomaly.' });
    } else if (error.code === 'NOT_FOUND') {
      explain = intl.formatMessage({ defaultMessage: 'Not found' });
    } else if (error.code === 'UNAUTHENTICATED') {
      explain = intl.formatMessage({ defaultMessage: 'Must be logged in.' });
    } else if (error.code === 'VALIDATION_FAIL') {
      explain = intl.formatMessage({ defaultMessage: 'Failed to validate.' });
    } else if (error.code === 'LIMIT_EXCEEDED') {
      explain = intl.formatMessage({ defaultMessage: 'Too many requests! Please try again later.' });
    } else if (error.code === 'NO_PERMISSION') {
      explain = intl.formatMessage({ defaultMessage: "You don't have permission to operate" });
    }
  }

  return explain;
};
