import { ApiError } from 'api';
import { useErrorExplain } from 'common';
import { useCallback } from 'react';
import { useSetBanner } from './useBanner';

export const useErrorAlert = () => {
  const explain = useErrorExplain();
  const setBanner = useSetBanner();
  return useCallback((e: ApiError) => {
    setBanner({ level: 'ERROR', content: explain(e) });
  }, [explain, setBanner]);
};
