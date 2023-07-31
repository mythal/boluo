import { ApiError, isApiError } from 'api';
import { useErrorExplain } from 'common';
import { FC, ReactNode, useMemo } from 'react';

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
      return <div className="rounded px-2 py-2 bg-error-100 border border-error-300">{explain(error)}</div>;
    case 'block':
      return <div>{message}</div>;
    default:
      // unstyled
      return <div className={className}>{message}</div>;
  }
};
