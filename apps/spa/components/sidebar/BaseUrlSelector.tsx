import { backendUrlAtom } from '@boluo/api-browser';
import { useAtom } from 'jotai';
import type { FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { useProxies } from '../../hooks/useProxies';
import { BaseUrlSelectorItem } from './BaseUrlSelectorItem';
import useSWR from 'swr';
import { backendUrlConfigAtom, testProxies } from '../../base-url';
import { updateRouteStats, convertTestResult, getRouteScore } from '../../hooks/useRouteMovingAverage';

export const BaseUrlSelector: FC = () => {
  const proxies = useProxies();
  const { data: testReuslt } = useSWR(['proxies', proxies], () => testProxies(proxies), {
    refreshInterval: 2000,
    fallbackData: [],
    suspense: false,
    onSuccess: (testResults) => {
      // Update EMA statistics when UI test results are received
      if (testResults) {
        testResults.forEach((record) => {
          const measureResult = convertTestResult(record.rtt);
          updateRouteStats(record.proxy.url, measureResult);
        });
      }
    },
  });
  const [backendUrlConfig, setBackendUrlConfig] = useAtom(backendUrlConfigAtom);
  const [backendUrl, setBackendUrl] = useAtom(backendUrlAtom);
  const handleSelect = (backendUrl: string) => {
    setBackendUrlConfig(backendUrl);
    setBackendUrl(backendUrl);
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
        {proxies.map((proxy, index) => {
          const result = testReuslt.find((item) => item.proxy.name === proxy.name);
          return (
            <BaseUrlSelectorItem
              key={index}
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
