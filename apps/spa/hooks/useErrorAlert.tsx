import { type ApiError } from '@boluo/api';
import { explainError } from '@boluo/locale/errors';
import AlertCircle from '@boluo/icons/AlertCircle';
import { useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useSetBanner } from './useBanner';

export const useErrorAlert = () => {
  const intl = useIntl();
  const setBanner = useSetBanner();
  return useCallback(
    (e: ApiError) => {
      const errorMessage = explainError(intl, e);
      const content = (
        <div className="flex items-center gap-2">
          <AlertCircle className="text-state-danger-text" />
          {errorMessage}
        </div>
      );
      setBanner({ level: 'ERROR', content });
      return e;
    },
    [intl, setBanner],
  );
};
