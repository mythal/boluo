import { useErrorExplain } from 'common';
import { FC } from 'react';

interface Props {
  error: unknown;
  type?: 'block' | 'banner';
}

export const ErrorDisplay: FC<Props> = ({ error, type = 'block' }) => {
  const explain = useErrorExplain();
  const message = explain(error);

  switch (type) {
    case 'banner':
      return <div className="rounded px-2 py-2 bg-error-100 border border-error-300">{explain(error)}</div>;
    case 'block':
      return <div>{message}</div>;
    default:
      return <div>{message}</div>;
  }
};
