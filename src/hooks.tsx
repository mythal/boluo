/* eslint-disable react-hooks/exhaustive-deps */
import React, { DependencyList, ReactElement, useCallback, useEffect, useState } from 'react';
import { AppResult } from './api/request';
import { Err, Result } from './utils/result';
import Loading from './components/molecules/Loading';
import { errorText } from './api/error';
import UiMessage from './components/molecules/InformationBar';

export function useOutside(
  callback: (() => void) | undefined,
  overlayRef: React.RefObject<HTMLElement | null>,
  triggerRef?: React.RefObject<HTMLElement | null>
) {
  /**
   * https://stackoverflow.com/a/42234988
   */

  const handleClickOutside = useCallback(
    function (event: MouseEvent) {
      const target = event.target as Element;
      if (!callback || !overlayRef.current || target === null) {
        return;
      } else if (overlayRef.current.contains(target)) {
        return;
      }
      if (triggerRef) {
        if (triggerRef.current === null || triggerRef.current.contains(target)) {
          return;
        }
      }
      callback();
    },
    [overlayRef, callback]
  );

  useEffect(() => {
    if (callback === undefined || !overlayRef.current?.offsetParent) {
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
    return [new Err(<Loading />), refetch];
  }
  return [
    result.mapErr((err) => (
      <UiMessage variant="ERROR">
        <span>{errorText(err)}</span>
      </UiMessage>
    )),
    refetch,
  ];
};

export const useRefetch = (refetch: () => void, intervalSecond = 32) => {
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        refetch();
      }
    }, intervalSecond * 1000);
    return () => window.clearInterval(interval);
  }, [refetch]);
};

export function useForceUpdate() {
  const [, setValue] = useState(0); // integer state
  return useCallback(() => setValue((value) => ++value), []); // update the state to force render
}

export const DEFAULT_TITLE = 'Boluo';

export function useTitle(suffix: string, prefix = ' - Boluo') {
  useEffect(() => {
    document.title = suffix + prefix;
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [suffix, prefix]);
}

export function useTitleWithFetchResult<T>(result: AppResult<T> | 'LOADING', titleMapper: (value: T) => string) {
  let title;
  if (result === 'LOADING') {
    title = '载入中';
  } else if (result.isOk) {
    title = titleMapper(result.value);
  } else {
    title = '出错了';
  }
  useTitle(title);
}
