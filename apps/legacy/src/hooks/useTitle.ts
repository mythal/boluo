import { useEffect } from 'react';
import { LOADING } from '../api/error';
import { type AppResult } from '../api/request';

export const DEFAULT_TITLE = 'Boluo';

export function useTitle(suffix: string, prefix = ' - Boluo') {
  useEffect(() => {
    document.title = suffix + prefix;
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [suffix, prefix]);
}

export function useTitleWithResult<T>(
  result: AppResult<T> | 'LOADING',
  titleMapper: (value: T) => string,
) {
  let title;
  if (result === 'LOADING') {
    title = '载入中';
  } else if (result.isOk) {
    title = titleMapper(result.value);
  } else if (result.value.code === LOADING) {
    title = '载入中';
  } else {
    title = 'Oops 出错了';
  }
  useTitle(title);
}
