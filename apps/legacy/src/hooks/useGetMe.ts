import { useEffect, useRef } from 'react';
import useSWR, { type SWRConfiguration } from 'swr';
import { FETCH_FAIL, type AppError } from '../api/error';
import { type AppResult, get } from '../api/request';
import { type SpaceWithMember } from '../api/spaces';
import { type Settings, type User } from '../api/users';
import { type Dispatch, useSelector } from '../store';

const unwrapResult = <T>(result: AppResult<T>): T => {
  if (result.isErr) {
    throw result.value;
  }
  return result.value;
};

const queryOptions = <T>(): SWRConfiguration<T, AppError> => ({
  refreshInterval: 0,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  onErrorRetry: (error, _key, _config, revalidate, context) => {
    if (error.code !== FETCH_FAIL || context.retryCount >= 1) {
      return;
    }
    setTimeout(() => {
      void revalidate({ retryCount: context.retryCount + 1 });
    }, 100);
  },
});

export const useGetMe = (dispatch: Dispatch, finish: () => void): void => {
  const baseUrl = useSelector((state) => state.ui.baseUrl);
  const finishedRef = useRef(false);
  // Login and logout actions own later session changes; this hook only bootstraps once.
  const initializedRef = useRef(false);
  const previousBaseUrlRef = useRef(baseUrl);
  const me = useSWR<User | null, AppError>(
    ['/users/query', { id: null }],
    () => get('/users/query', { id: null }).then(unwrapResult),
    queryOptions(),
  );
  const { data: meData, error: meError, mutate: retryMe } = me;
  const userId = meData?.id;
  const settings = useSWR<Settings, AppError>(
    userId ? ['/users/settings', userId] : null,
    () => get('/users/settings').then(unwrapResult),
    queryOptions(),
  );
  const { data: settingsData, error: settingsError, mutate: retrySettings } = settings;
  const spaces = useSWR<SpaceWithMember[], AppError>(
    userId ? ['/spaces/my', userId] : null,
    () => get('/spaces/my').then(unwrapResult),
    queryOptions(),
  );
  const { data: spacesData, error: spacesError, mutate: retrySpaces } = spaces;

  useEffect(() => {
    if (previousBaseUrlRef.current === baseUrl) {
      return;
    }
    previousBaseUrlRef.current = baseUrl;
    if (initializedRef.current) {
      return;
    }
    if (meData === undefined || meError) {
      void retryMe();
    }
    if (!userId) {
      return;
    }
    if (settingsData === undefined || settingsError) {
      void retrySettings();
    }
    if (spacesData === undefined || spacesError) {
      void retrySpaces();
    }
  }, [
    baseUrl,
    meData,
    meError,
    retryMe,
    retrySettings,
    retrySpaces,
    settingsData,
    settingsError,
    spacesData,
    spacesError,
    userId,
  ]);

  useEffect(() => {
    const finishOnce = () => {
      if (!finishedRef.current) {
        finishedRef.current = true;
        finish();
      }
    };

    if (initializedRef.current) {
      return;
    }
    if (meError || settingsError || spacesError) {
      finishOnce();
      return;
    }
    if (meData === undefined) {
      return;
    }
    if (meData === null) {
      initializedRef.current = true;
      dispatch({ type: 'LOGGED_OUT' });
      finishOnce();
      return;
    }
    if (settingsData === undefined || spacesData === undefined) {
      return;
    }

    initializedRef.current = true;
    dispatch({
      type: 'LOGGED_IN',
      user: meData,
      settings: settingsData,
      mySpaces: spacesData,
      myChannels: [],
    });
    finishOnce();
  }, [dispatch, finish, meData, meError, settingsData, settingsError, spacesData, spacesError]);
};
