import { backendUrlAtom } from '@boluo/api-browser';
import { useAtom } from 'jotai';
import type { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { useProxies } from '../../hooks/useProxies';
import { BaseUrlSelectorItem } from './BaseUrlSelectorItem';
import useSWR from 'swr';
import { shouldAutoSelectAtom, testProxies } from '../../base-url';

interface Props {}

export const BaseUrlSelector: FC<Props> = () => {
  const proxies = useProxies();
  const { data: testReuslt } = useSWR(['proxies', proxies], () => testProxies(proxies), {
    refreshInterval: 2000,
    fallbackData: [],
    suspense: false,
  });
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
          {proxies.map((proxy) => {
            const result = testReuslt.find((item) => item.proxy.name === proxy.name);
            return (
              <BaseUrlSelectorItem
                key={proxy.name}
                proxy={proxy}
                result={result?.rtt ?? 'FAILED'}
                selected={proxy.url === backendUrl}
                setUrl={handleSelect}
              />
            );
          })}
        </div>
      </label>

      <label className="flex items-center gap-1 py-2">
        <input type="checkbox" checked={shouldAutoSelect} onChange={(e) => setShouldAutoSelect(e.target.checked)} />
        <span>
          <FormattedMessage defaultMessage="Auto Select" />
        </span>
      </label>
    </div>
  );
};
