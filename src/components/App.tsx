import React, { useState, Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';
import Flash from './organisms/Flash';
import { useDispatch, useSelector } from '@/store';
import 'sanitize.css';
import 'sanitize.css/typography.css';
import { useGetMe } from '@/hooks';
import { Router } from '@/components/Router';
import PageLoading from '@/components/molecules/PageLoading';
import PageError from '@/components/molecules/PageError';

export const App: React.FC = () => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  useGetMe(dispatch, () => setLoading(false));
  const information = useSelector(
    (state) => state.information,
    (a, b) => a.equals(b)
  );
  if (loading) {
    return <PageLoading text="load user information" />;
  }
  return (
    <PageError>
      <Suspense fallback={<PageLoading text="load module" />}>
        <BrowserRouter>
          <Router />
        </BrowserRouter>
        {information.size !== 0 && <Flash information={information} />}
      </Suspense>
    </PageError>
  );
};
