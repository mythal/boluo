import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { useDispatch, useSelector } from '../store';
import Flash from './organisms/Flash';
import 'sanitize.css';
import 'sanitize.css/typography.css';
import { useAtomValue } from 'jotai';
import { selectBestBaseUrl } from '../base-url';
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
  useEffect(() => {
    if (!autoSelect) {
      return;
    }
    selectBestBaseUrl().then((baseUrl) => dispatch({ type: 'CHANGE_BASE_URL', baseUrl }));
    const handle = window.setInterval(() => {
      selectBestBaseUrl().then((baseUrl) => dispatch({ type: 'CHANGE_BASE_URL', baseUrl }));
    }, 10000);
    return () => window.clearInterval(handle);
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
