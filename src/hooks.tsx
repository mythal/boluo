/* eslint-disable react-hooks/exhaustive-deps */
import React, { DependencyList, ReactElement, useCallback, useEffect, useState } from 'react';
import { AppResult } from './api/request';
import { Err, Result } from './result';
import { Loading } from './components/Loading';
import { AlertItem } from './components/AlertItem';
import { errorText } from './api/error';

export function useOutside(ref: React.MutableRefObject<HTMLElement | null>, callback: () => void) {
  /**
   * https://stackoverflow.com/a/42234988
   */

  const handleClickOutside = useCallback(
    function(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Element)) {
        callback();
      }
    },
    [ref, callback]
  );

  useEffect(() => {
    if (ref.current?.offsetParent === null) {
      return;
    }
    // Bind the event listener
    document.addEventListener('click', handleClickOutside);
    return () => {
      // Unbind the event listener on clean up
      document.removeEventListener('click', handleClickOutside);
    };
  });
}

export const useFetch = <T,>(f: () => Promise<T>, deps: DependencyList): [T | 'LOADING', () => void] => {
  const [result, setResult] = useState<T | 'LOADING'>('LOADING');

  useEffect(() => {
    f().then(setResult);
  }, deps);

  const refetch = useCallback(() => {
    f().then(setResult);
  }, deps);

  return [result, refetch];
};

export const useFetchResult = <T,>(
  fetch: () => Promise<AppResult<T>>,
  deps: DependencyList
): [Result<T, ReactElement>, () => void] => {
  const [result, refetch] = useFetch<AppResult<T>>(fetch, deps);
  if (result === 'LOADING') {
    return [
      new Err(
        (
          <div className="h-full w-full flex items-center justify-center">
            <Loading className="w-32 h-32" />
          </div>
        )
      ),
      refetch,
    ];
  }
  return [result.mapErr(err => <AlertItem level="ERROR" message={errorText(err)} />), refetch];
};
