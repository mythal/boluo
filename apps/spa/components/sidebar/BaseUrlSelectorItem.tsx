import { type Proxy } from '@boluo/api';
import { type FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { type BaseUrlTestResult } from '../../base-url';
import { SelectBox } from '@boluo/ui/SelectBox';

interface Props {
  proxy: Proxy;
  result: BaseUrlTestResult['rtt'] | null | undefined;
  selected: boolean;
  setUrl: (url: string) => void;
}

export const BaseUrlSelectorItem: FC<Props> = ({ proxy, result, setUrl, selected }) => {
  const { url, name, region } = proxy;
  return (
    <SelectBox
      selected={selected}
      onSelected={() => setUrl(url)}
      title={
        <div>
          <span className="text-lg">{name}</span>
          {region && <span className="ml-1 text-sm">({region})</span>}
        </div>
      }
      description={
        <div>
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
      }
    />
  );
};
