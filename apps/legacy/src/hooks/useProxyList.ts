import { useMemo } from 'react';
import useSWR from 'swr';
import { type Proxy, getDefaultBaseUrl } from '../base-url';

const fetchList = async (): Promise<Proxy[]> => {
  const response = await fetch(getDefaultBaseUrl() + '/api/info/proxies');
  const proxies = (await response.json()) as Proxy[];
  return proxies.map((proxy) => {
    // TODO: Remove this hack
    if (proxy.url.endsWith('boluo.chat') && window.location.origin.endsWith('boluochat.com')) {
      return { ...proxy, url: proxy.url.replace('boluo.chat', 'boluochat.com') };
    }
    return proxy;
  });
};

export const useProxyList = (): Proxy[] => {
  const { data } = useSWR(['/api/info/proxies'], () => fetchList(), { refreshInterval: 10000 });
  return useMemo(() => {
    const defaultProxy: Proxy = { url: getDefaultBaseUrl(), name: '默认' };
    if (!data) {
      return [defaultProxy];
    }
    const filtered = data.filter((proxy) => proxy.url !== getDefaultBaseUrl());
    return [defaultProxy, ...filtered];
  }, [data]);
};
