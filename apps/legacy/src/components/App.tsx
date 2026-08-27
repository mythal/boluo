import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import store, { useDispatch, useSelector } from '../store';
import Flash from './organisms/Flash';
import 'sanitize.css';
import 'sanitize.css/typography.css';
import { useAtomValue } from 'jotai';
import {
  AUTO_ROUTE_PROBE_INTERVAL_MS,
  selectAutomaticBaseUrl,
  selectInitialBaseUrl,
} from '../base-url';
import PageLoading from '../components/molecules/PageLoading';
import { RenderError } from './molecules/RenderError';
import { useGetMe } from '../hooks/useGetMe';
import { autoSelectAtom } from '../states/connection';
import { Router } from './Router';
import Button from './atoms/Button';

export const App: React.FC = () => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const autoSelect = useAtomValue(autoSelectAtom);
  const baseUrl = useSelector((state) => state.ui.baseUrl);
  const selectedAtRef = useRef(0);

  useEffect(() => {
    selectedAtRef.current = Date.now();
  }, [baseUrl]);

  useEffect(() => {
    if (!autoSelect) {
      return;
    }
    let cancelled = false;
    const selectInitial = async () => {
      const initialUrl = store.getState().ui.baseUrl;
      const decision = await selectInitialBaseUrl(initialUrl);
      if (decision && !cancelled && store.getState().ui.baseUrl === initialUrl) {
        dispatch({
          type: 'CHANGE_BASE_URL',
          baseUrl: decision.url,
          reason:
            decision.reason === 'FAILOVER'
              ? 'LEGACY_FAILOVER_ROUTE_CHANGED'
              : 'LEGACY_PERFORMANCE_ROUTE_CHANGED',
        });
      }
    };
    void selectInitial().catch(() => undefined);
    const handle = window.setInterval(() => {
      const currentUrl = store.getState().ui.baseUrl;
      void selectAutomaticBaseUrl(currentUrl, selectedAtRef.current)
        .then((decision) => {
          if (cancelled || !decision || store.getState().ui.baseUrl !== currentUrl) return;
          dispatch({
            type: 'CHANGE_BASE_URL',
            baseUrl: decision.url,
            reason:
              decision.reason === 'FAILOVER'
                ? 'LEGACY_FAILOVER_ROUTE_CHANGED'
                : 'LEGACY_PERFORMANCE_ROUTE_CHANGED',
          });
        })
        .catch(() => undefined);
    }, AUTO_ROUTE_PROBE_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(handle);
    };
  }, [autoSelect, dispatch]);

  const initializationError = useGetMe(
    dispatch,
    useCallback(() => setLoading(false), []),
  );
  const flashState = useSelector(
    (state) => state.flash,
    (a, b) => a.equals(b),
  );
  if (loading) {
    return <PageLoading text="load user information" />;
  }
  if (initializationError) {
    return (
      <div>
        <RenderError error={initializationError} />
        <Button onClick={() => location.reload()}>刷新重试</Button>
      </div>
    );
  }
  return (
    <Suspense fallback={<PageLoading text="load modules" />}>
      <BrowserRouter>
        <Router />
      </BrowserRouter>
      {flashState.size !== 0 && <Flash flashState={flashState} />}
    </Suspense>
  );
};
