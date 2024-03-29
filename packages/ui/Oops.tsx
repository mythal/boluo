import { useErrorExplain } from '@boluo/common';
import type { FC } from 'react';
import { FormattedMessage } from 'react-intl';

export type OopsType = 'block' | 'inline' | 'inline-small';

interface Props {
  error: unknown;
  type?: OopsType;
}

export const Oops: FC<Props> = ({ error, type = 'block' }) => {
  const errorExplain = useErrorExplain();
  const message = errorExplain(error);
  if (type === 'inline') {
    return (
      <span>
        <span className="font-bold">
          <FormattedMessage defaultMessage="Oops" />
        </span>{' '}
        <span>{message}</span>
      </span>
    );
  } else if (type === 'inline-small') {
    return (
      <span className="font-bold" title={message}>
        <FormattedMessage defaultMessage="Oops" />
      </span>
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div>
        <div className="font-bold">
          <FormattedMessage defaultMessage="Oops" />
        </div>
        <div>{message}</div>
      </div>
    </div>
  );
};
