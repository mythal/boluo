import { type ApiError, isApiError } from '@boluo/api';
import { explainError } from '@boluo/locale/errors';
import { type FC, type ReactNode, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { ErrorMessageBox } from '@boluo/ui/ErrorMessageBox';

interface Props {
  error: unknown;
  type?: 'block' | 'unstyled' | 'banner';
  className?: string;
  custom?: (error: ApiError) => ReactNode;
}

export const ErrorDisplay: FC<Props> = ({ error, type = 'unstyled', className = '', custom }) => {
  const intl = useIntl();
  const message: ReactNode = useMemo(() => {
    if (custom && isApiError(error)) {
      const customMessage = custom(error);
      if (customMessage) {
        return customMessage;
      }
    }
    return explainError(intl, error);
  }, [custom, error, intl]);

  switch (type) {
    case 'banner':
      return <ErrorMessageBox>{message}</ErrorMessageBox>;
    case 'block':
      return <div className="ErrorDisplay">{message}</div>;
    default:
      // unstyled
      return <div className={className}>{message}</div>;
  }
};
