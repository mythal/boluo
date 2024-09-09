import { type Proxy } from '@boluo/api';
import clsx from 'clsx';
import { type FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { type BaseUrlTestResult } from '../../base-url';

interface Props {
  proxy: Proxy;
  result: BaseUrlTestResult['rtt'] | null | undefined;
  selected: boolean;
  setUrl: (url: string) => void;
}

export const BaseUrlSelectorItem: FC<Props> = ({ proxy, result, setUrl, selected }) => {
  const { url, name, region } = proxy;
  return (
    <button
      onClick={() => setUrl(url)}
      className={clsx(
        'border-1/2 flex items-center justify-between rounded-md px-4 py-2',
        selected
          ? 'border-brand-400 bg-brand-100 hover:bg-brand-200'
          : 'border-surface-200 bg-surface-50 hover:bg-surface-200 hover:border-surface-300',
      )}
    >
      <div>
        <span className="text-lg">{name}</span>
        {region && <span className="ml-1 text-sm">({region})</span>}
      </div>
      <div className="min-w-[6em] text-right">
        {result == null && <span>...</span>}
        {result === 'FAILED' && (
          <span className="text-error-700">
            <FormattedMessage defaultMessage="Failed" />
          </span>
        )}
        {result === 'TIMEOUT' && (
          <span>
            <FormattedMessage defaultMessage="Timeout" />
          </span>
        )}
        {typeof result === 'number' && <span>{result.toFixed(2)} ms</span>}
      </div>
    </button>
  );
};
