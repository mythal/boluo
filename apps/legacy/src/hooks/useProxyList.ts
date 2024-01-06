import { useMemo } from 'react';
import useSWR from 'swr';
import { Proxy } from '../base-url';

const fetchList = async (): Promise<Proxy[]> => {
  const response = await fetch('/api/info/proxies');
  const proxies = (await response.json()) as Proxy[];
  return proxies;
};

export const useProxyList = (): Proxy[] => {
  const { data } = useSWR(['/api/info/proxies'], () => fetchList(), { refreshInterval: 10000 });
  return useMemo(() => {
    const defaultProxy: Proxy = { url: location.origin, name: '默认' };
    if (!data) {
      return [defaultProxy];
    }
    return [defaultProxy, ...data];
  }, [data]);
};
