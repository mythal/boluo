/* eslint-disable react-hooks/exhaustive-deps */
import React, { DependencyList, RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { AppResult, get } from './api/request';
import { Err, Ok } from './utils/result';
import { LOADING, loading } from './api/error';
import { SpaceWithRelated } from './api/spaces';
import { clearCsrfToken } from './api/csrf';
import { LoggedOut } from './actions/profile';
import { useDispatch } from './components/Provider';
import { useHistory } from 'react-router-dom';

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

export function useIsUnmount(): RefObject<boolean> {
  const flag = useRef(false);
  useEffect(
    () => () => {
      flag.current = true;
    },
    []
  );
  return flag;
}

export function useFetch<T>(f: () => Promise<T>, deps: DependencyList): [T | 'LOADING', () => void] {
  const [result, setResult] = useState<T | 'LOADING'>('LOADING');
  const isUnmount = useIsUnmount();
  const load = () => {
    f().then((result) => {
      if (isUnmount.current) {
        return;
      }
      setResult(result);
    });
  };

  useEffect(load, deps);

  const refetch = useCallback(load, deps);

  return [result, refetch];
}

export function flatResult<T>(result: AppResult<T> | 'LOADING'): AppResult<T> {
  if (result !== 'LOADING') {
    return result;
  }
  return new Err(loading) as AppResult<T>;
}

export function useFetchResult<T>(f: () => Promise<AppResult<T>>, deps: DependencyList): [AppResult<T>, () => void] {
  const [result, refetch] = useFetch(f, deps);
  return [flatResult<T>(result), refetch];
}

export const useRefetch = (refetch: () => void, intervalSecond = 32) => {
  useEffect(() => {
    if (intervalSecond === 0) {
      return;
    }
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        refetch();
      }
    }, intervalSecond * 1000);
    return () => window.clearInterval(interval);
  }, [refetch, intervalSecond]);
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
  } else if (result.value.code === LOADING) {
    title = '载入中';
  } else {
    title = 'Oops 出错了';
  }
  useTitle(title);
}

export type Mapper<T> = (prev: T) => T;
export type Updater<T> = (mapper: Mapper<T>) => void;
const register: Record<string, Array<Updater<unknown>>> = {};

export const useRegisterFetch = <T,>(
  id: string,
  f: () => Promise<AppResult<T>>,
  deps: DependencyList
): [AppResult<T>, () => void] => {
  const [result, setResult] = useState<AppResult<T> | 'LOADING'>('LOADING');
  const isUnmount = useIsUnmount();
  const load = () => {
    f().then((result) => {
      if (isUnmount.current) {
        return;
      }
      setResult(result);
    });
  };
  useEffect(load, deps);
  const refetch = useCallback(load, deps);

  const updater = useCallback((mapper: Mapper<T>) => {
    setResult((prev: AppResult<T> | 'LOADING') => {
      if (prev === 'LOADING' || !prev.isOk) {
        return prev;
      }
      return new Ok(mapper(prev.value)) as AppResult<T>;
    });
  }, []);

  useEffect(() => {
    if (register[id]) {
      register[id].push(updater as Updater<unknown>);
    } else {
      register[id] = [updater as Updater<unknown>];
    }
    return () => {
      register[id] = register[id].filter((x) => x !== updater);
    };
  }, [id]);

  return [flatResult<T>(result), refetch];
};

export function updateCache<T>(id: string, mapper: Mapper<T>) {
  if (register[id]) {
    register[id].forEach((updater) => setTimeout(() => updater(mapper as Mapper<unknown>), 0));
  }
}

export function useSpaceWithRelated(id: string): [AppResult<SpaceWithRelated>, () => void] {
  return useRegisterFetch<SpaceWithRelated>(id, () => get('/spaces/query_with_related', { id }), [id]);
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
