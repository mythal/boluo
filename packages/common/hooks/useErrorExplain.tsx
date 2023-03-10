import { ApiError, isApiError } from 'api';
import { useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';

const createApiErrorMap = <T extends Record<ApiError['code'], string>>(map: T) => {
  return map;
};

export const useErrorExplain = () => {
  const intl = useIntl();
  const defaultMessage = useMemo(() => intl.formatMessage({ defaultMessage: 'Something going wrong.' }), [intl]);
  const apiErrorMap = useMemo(() =>
    createApiErrorMap({
      BAD_REQUEST: intl.formatMessage({ defaultMessage: 'Malformed request.' }),
      METHOD_NOT_ALLOWED: intl.formatMessage({ defaultMessage: 'Wrong request method.' }),
      CONFLICT: intl.formatMessage({ defaultMessage: 'There is a resource conflict.' }),
      UNEXPECTED: intl.formatMessage({ defaultMessage: 'Server Internal Error' }),
      NOT_JSON: intl.formatMessage({ defaultMessage: 'An error occurred while parsing the data.' }),
      FETCH_FAIL: intl.formatMessage({ defaultMessage: 'Request failed, possible network anomaly.' }),
      NOT_FOUND: intl.formatMessage({ defaultMessage: 'Not found' }),
      UNAUTHENTICATED: intl.formatMessage({ defaultMessage: 'Must be logged in.' }),
      VALIDATION_FAIL: intl.formatMessage({ defaultMessage: 'Validation failed.' }),
      LIMIT_EXCEEDED: intl.formatMessage({ defaultMessage: 'Limit exceeded.' }),
      NO_PERMISSION: intl.formatMessage({ defaultMessage: 'No permission.' }),
    }), [intl]);

  return useCallback((error: unknown): string => {
    if (isApiError(error)) {
      return apiErrorMap[error.code] || defaultMessage;
    }
    return defaultMessage;
  }, [apiErrorMap, defaultMessage]);
};