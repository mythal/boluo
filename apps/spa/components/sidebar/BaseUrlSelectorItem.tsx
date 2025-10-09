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
        'BaseUrlSelectorItem flex items-center justify-between rounded px-4 py-2 transition-colors',
        selected
          ? 'bg-surface-selectable-selected'
          : 'bg-surface-selectable-default hover:bg-surface-selectable-hover',
      )}
    >
      <div>
        <span className="text-lg">{name}</span>
        {region && <span className="ml-1 text-sm">({region})</span>}
      </div>
      <div className="min-w-[6em] text-right">
        {result == null && <span>...</span>}
        {result === 'FAILED' && (
          <span className="text-state-danger-text">
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
