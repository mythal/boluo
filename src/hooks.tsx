/* eslint-disable react-hooks/exhaustive-deps */
import React, { DependencyList, ReactElement, useCallback, useEffect, useState } from 'react';
import { AppResult } from './api/request';
import { Err, Result } from './result';
import { Loading } from './components/Loading';
import { InformationItem } from './components/InformationItem';
import { errorText } from './api/error';
import lottie from 'lottie-web';

export function useOutside(
  callback: (() => void) | undefined,
  overlayRef: React.RefObject<HTMLElement | null>,
  triggerRef?: React.RefObject<HTMLElement | null>
) {
  /**
   * https://stackoverflow.com/a/42234988
   */

  const handleClickOutside = useCallback(
    function(event: MouseEvent) {
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
  return [result.mapErr(err => <InformationItem level="ERROR" content={<span>{errorText(err)}</span>} />), refetch];
};

export function useForceUpdate() {
  const [, setValue] = useState(0); // integer state
  return () => setValue(value => ++value); // update the state to force render
}

export function useLottie(container: React.RefObject<Element | null>, animationData: object) {
  useEffect(() => {
    if (container.current) {
      lottie.loadAnimation({
        container: container.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        animationData,
      });
    }
  }, [container.current === null]);
}
