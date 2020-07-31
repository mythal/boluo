/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from 'react';
import { AppResult, get } from './api/request';
import { LOADING } from './api/error';
import { clearCsrfToken } from './api/csrf';
import { LoggedOut } from './actions/profile';
import { useHistory } from 'react-router-dom';
import { useDispatch, useSelector } from './store';

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

export function useTitleWithResult<T>(result: AppResult<T> | 'LOADING', titleMapper: (value: T) => string) {
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

export function useLogout(): () => void {
  const dispatch = useDispatch();
  const history = useHistory();
  return async () => {
    await get('/users/logout');
    clearCsrfToken();
    dispatch<LoggedOut>({ type: 'LOGGED_OUT' });
    history.push('/');
  };
}

export function useIsLoggedIn(): boolean {
  return useSelector((state) => state.profile !== undefined);
}
