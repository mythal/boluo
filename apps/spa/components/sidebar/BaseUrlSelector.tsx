import { backendUrlAtom } from '@boluo/api-browser';
import { useAtom } from 'jotai';
import type { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { useProxies } from '../../hooks/useProxies';
import { BaseUrlSelectorItem } from './BaseUrlSelectorItem';
import useSWR from 'swr';
import { backendUrlConfigAtom, testProxies } from '../../base-url';

export const BaseUrlSelector: FC = () => {
  const proxies = useProxies();
  const { data: testReuslt } = useSWR(['proxies', proxies], () => testProxies(proxies), {
    refreshInterval: 2000,
    fallbackData: [],
    suspense: false,
  });
  const [backendUrlConfig, setBackendUrlConfig] = useAtom(backendUrlConfigAtom);
  const [backendUrl, setBackendUrl] = useAtom(backendUrlAtom);
  const handleSelect = (backendUrl: string) => {
    setBackendUrlConfig(backendUrl);
    setBackendUrl(backendUrl);
  };
  return (
    <div>
      <div>
        <FormattedMessage defaultMessage="Change Connection Region" />
        <div className="text-surface-900 flex flex-col gap-1 pt-1">
          {proxies.map((proxy, index) => {
            const result = testReuslt.find((item) => item.proxy.name === proxy.name);
            return (
              <BaseUrlSelectorItem
                key={index}
                proxy={proxy}
                result={result?.rtt}
                selected={proxy.url === backendUrl}
                setUrl={handleSelect}
              />
            );
          })}
        </div>
      </div>

      <label className="flex items-center gap-1 py-2">
        <input
          type="checkbox"
          checked={backendUrlConfig === 'auto'}
          onChange={(e) => setBackendUrlConfig(e.target.checked ? 'auto' : '')}
        />
        <span>
          <FormattedMessage defaultMessage="Auto Select" />
        </span>
      </label>
    </div>
  );
};
