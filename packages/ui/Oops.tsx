import type { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { useErrorExplain } from './hooks/useErrorExplain';

export type OopsType = 'block' | 'inline' | 'inline-small';

interface Props {
  error: unknown;
  type?: OopsType;
}

export const Oops: FC<Props> = ({ error, type = 'block' }) => {
  const explain = useErrorExplain(error);
  if (type === 'inline') {
    return (
      <span>
        <span className="font-bold">
          <FormattedMessage defaultMessage="Oops" />
        </span>{' '}
        <span>{explain}</span>
      </span>
    );
  } else if (type === 'inline-small') {
    return (
      <span className="font-bold" title={explain}>
        <FormattedMessage defaultMessage="Oops" />
      </span>
    );
  }
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div>
        <div className="font-bold">
          <FormattedMessage defaultMessage="Oops" />
        </div>
        <div>
          {explain}
        </div>
      </div>
    </div>
  );
};
