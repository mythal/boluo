import { isApiError } from '@boluo/api';
import { captureException } from './error';

const requestPathFromKey = (key: unknown): string => {
  if (typeof key === 'string') return key;
  if (Array.isArray(key) && typeof key[0] === 'string') return key[0];
  return 'unknown';
};

export const reportSwrError = (error: unknown, key: unknown): void => {
  if (isApiError(error)) {
    switch (error.code) {
      case 'UNAUTHENTICATED':
      case 'NOT_FOUND':
      case 'NO_PERMISSION':
      case 'FETCH_FAIL':
        return;
    }
  }
  captureException(error, {
    context: {
      source: 'swr',
      request_path: requestPathFromKey(key),
      ...(isApiError(error) ? { api_error_code: error.code } : {}),
    },
  });
};
