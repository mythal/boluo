import { backendUrlAtom } from 'api-browser';
import { useAtom } from 'jotai';
import type { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { shouldAutoSelectAtom, useAutoSelectProxy } from '../../hooks/useAutoSelectProxy';
import { useProxies } from '../../hooks/useProxies';
import { BaseUrlSelectorItem } from './BaseUrlSelectorItem';

interface Props {}

export const BaseUrlSelector: FC<Props> = () => {
  const proxies = useProxies();
  const testReuslt = useAutoSelectProxy(2000);
  const [shouldAutoSelect, setShouldAutoSelect] = useAtom(shouldAutoSelectAtom);
  const [backendUrl, setBackendUrl] = useAtom(backendUrlAtom);
  const handleSelect = (backendUrl: string) => {
    setShouldAutoSelect(false);
    setBackendUrl(backendUrl);
  };
  return (
    <div>
      <label className="block">
        <FormattedMessage defaultMessage="Change Connection Region" />
        <div className="text-surface-900 flex flex-col gap-1 pt-1">
          {proxies.map((proxy) => (
            <BaseUrlSelectorItem
              key={proxy.name}
              proxy={proxy}
              result={testReuslt.find((item) => item.proxy.name === proxy.name)?.result}
              selected={proxy.url === backendUrl}
              setUrl={handleSelect}
            />
          ))}
        </div>
      </label>

      <label className="flex items-center gap-1 py-2">
        <input type="checkbox" checked={shouldAutoSelect} onChange={(e) => setShouldAutoSelect(e.target.checked)} />
        <FormattedMessage defaultMessage="Auto Select" />
      </label>
    </div>
  );
};
