import { backendUrlAtom } from '@boluo/api-browser';
import { useAtom } from 'jotai';
import type { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { useProxies } from '../../hooks/useProxies';
import { BaseUrlSelectorItem } from './BaseUrlSelectorItem';
import useSWR from 'swr';
import { backendUrlChangeReasonAtom, backendUrlConfigAtom, testProxies } from '../../base-url';
import {
  getRouteScore,
  recordRouteProbe,
  toRouteProbeResult,
} from '../../route-selection-state';

export const BaseUrlSelector: FC = () => {
  const proxies = useProxies();
  const { data: testResults } = useSWR(['proxies', proxies], () => testProxies(proxies), {
    refreshInterval: 2000,
    fallbackData: [],
    suspense: false,
    onSuccess: (results) => {
      results.forEach((record) => {
        recordRouteProbe(record.proxy.url, toRouteProbeResult(record.rtt));
      });
    },
  });
  const [backendUrlConfig, setBackendUrlConfig] = useAtom(backendUrlConfigAtom);
  const [backendUrl, setBackendUrl] = useAtom(backendUrlAtom);
  const [, setBackendUrlChangeReason] = useAtom(backendUrlChangeReasonAtom);
  const handleSelect = (url: string) => {
    setBackendUrlConfig(url);
    setBackendUrlChangeReason('API_ENDPOINT_CHANGED');
    setBackendUrl(url);
  };
  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-2 px-1 text-sm">
        <input
          type="checkbox"
          checked={backendUrlConfig === 'auto'}
          onChange={(e) => setBackendUrlConfig(e.target.checked ? 'auto' : '')}
        />
        <span>
          <FormattedMessage defaultMessage="Auto Select" />
        </span>
      </label>
      <div className="text-text-primary flex flex-col">
        {proxies.map((proxy) => {
          const result = testResults.find((item) => item.proxy.name === proxy.name);
          return (
            <BaseUrlSelectorItem
              key={`${proxy.name}:${proxy.url}`}
              proxy={proxy}
              result={result?.rtt}
              score={getRouteScore(proxy.url)}
              selected={proxy.url === backendUrl}
              setUrl={handleSelect}
            />
          );
        })}
      </div>
    </div>
  );
};
