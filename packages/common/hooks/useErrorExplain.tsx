import { type ApiError, isApiError } from '@boluo/api';
import { useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';

export const useErrorExplain = () => {
  const intl = useIntl();
  const defaultMessage = useMemo(() => intl.formatMessage({ defaultMessage: 'Something going wrong.' }), [intl]);
  const apiErrorMap = useMemo(
    () =>
      ({
        BAD_REQUEST: intl.formatMessage({ defaultMessage: 'Malformed request.' }),
        METHOD_NOT_ALLOWED: intl.formatMessage({ defaultMessage: 'Wrong request method.' }),
        CONFLICT: intl.formatMessage({ defaultMessage: 'There is a resource conflict.' }),
        UNEXPECTED: intl.formatMessage({ defaultMessage: "Oops! Something went wrong, but it wasn't your fault" }),
        NOT_JSON: intl.formatMessage({ defaultMessage: 'An error occurred while parsing the data.' }),
        FETCH_FAIL: intl.formatMessage({ defaultMessage: 'Request failed, possible network anomaly.' }),
        NOT_FOUND: intl.formatMessage({ defaultMessage: 'Not found' }),
        UNAUTHENTICATED: intl.formatMessage({ defaultMessage: 'Must be logged in.' }),
        VALIDATION_FAIL: intl.formatMessage({ defaultMessage: 'The data submitted did not pass validation.' }),
        LIMIT_EXCEEDED: intl.formatMessage({ defaultMessage: 'Limit exceeded.' }),
        NO_PERMISSION: intl.formatMessage({ defaultMessage: 'No permission.' }),
      }) satisfies Record<ApiError['code'], string>,
    [intl],
  );

  return useCallback(
    (error: unknown): string => {
      if (isApiError(error)) {
        return apiErrorMap[error.code] || defaultMessage;
      } else if (typeof error === 'string') {
        return error;
      }
      return defaultMessage;
    },
    [apiErrorMap, defaultMessage],
  );
};
