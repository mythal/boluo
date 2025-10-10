import { type ApiError, isApiError } from '@boluo/api';
import { useErrorExplain } from '@boluo/common/hooks/useErrorExplain';
import { type FC, type ReactNode, useMemo } from 'react';
import { ErrorMessageBox } from '@boluo/ui/ErrorMessageBox';

interface Props {
  error: unknown;
  type?: 'block' | 'unstyled' | 'banner';
  className?: string;
  custom?: (error: ApiError) => ReactNode;
}

export const ErrorDisplay: FC<Props> = ({ error, type = 'unstyled', className = '', custom }) => {
  const explain = useErrorExplain();
  const message: ReactNode = useMemo(() => {
    if (custom && isApiError(error)) {
      const customMessage = custom(error);
      if (customMessage) {
        return customMessage;
      }
    }
    return explain(error);
  }, [custom, error, explain]);

  switch (type) {
    case 'banner':
      return <ErrorMessageBox>{explain(error)}</ErrorMessageBox>;
    case 'block':
      return <div>{message}</div>;
    default:
      // unstyled
      return <div className={className}>{message}</div>;
  }
};
