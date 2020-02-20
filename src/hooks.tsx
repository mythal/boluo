/* eslint-disable react-hooks/exhaustive-deps */
import React, { DependencyList, ReactElement, useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { LOADING } from './App/states';
import { AppResult } from './api/request';
import { AppError } from './api/error';
import { Loading } from './Loading/Loading';
import { ShowAppError } from './Error/ShowAppError';
import { Err, Result } from './result';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useAsync = (f: () => Promise<any>, deps?: DependencyList): void => {
  useEffect(() => {
    f().catch(console.error);
  }, deps);
};

export const useNext = (): string => {
  let { next } = useParams<{ next?: string }>();
  if (next) {
    next = decodeURIComponent(next);
    if (next.length > 0 && next[0] === '/') {
      return next;
    }
  }
  return '/';
};

export const useFetch = <T,>(f: () => Promise<T>, deps: DependencyList): [T | LOADING, () => void] => {
  const [result, setResult] = useState<T | LOADING>(LOADING);

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
  if (result === LOADING) {
    return [new Err((<Loading />)), refetch];
  }
  return [result.mapErr(err => <ShowAppError err={err} />), refetch];
};

export type Render<T> = (value: T, refetch: () => void) => ReactElement | null;

export const useRender = <T,>(
  fetch: () => Promise<AppResult<T>>,
  render: Render<T>,
  deps: DependencyList,
  onError?: (err: AppError) => ReactElement | null,
  onLoading?: ReactElement
): React.ReactElement | null => {
  const [result, refetch] = useFetch(fetch, deps);
  let element: ReactElement | null;
  if (result === LOADING) {
    element = onLoading ?? <Loading />;
  } else if (result.isOk) {
    element = render(result.value, refetch);
  } else {
    element = onError ? onError(result.value) : <ShowAppError err={result.value} />;
  }
  return element;
};
