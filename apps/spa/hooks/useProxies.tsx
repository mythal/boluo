import { type Proxy } from '@boluo/api';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import useSWR from 'swr';
import { BACKEND_URL } from '../const';

const DEFAULT_BACKEND_URL =
  BACKEND_URL || (typeof window === 'undefined' ? '' : window.location.origin);

const fetcher = async (): Promise<Proxy[]> => {
  try {
    const res = await fetch(`${DEFAULT_BACKEND_URL}/api/info/proxies`);
    return (await res.json()) as Proxy[];
  } catch (error) {
    return [];
  }
};

export const useProxies = () => {
  const { data: proxies } = useSWR(['/info/proxies'], fetcher, {
    suspense: false,
    revalidateOnFocus: true,
    refreshInterval: 1000 * 60,
  });
  const intl = useIntl();
  return useMemo(() => {
    if (typeof window === 'undefined') return [];
    const defaultName = intl.formatMessage({ defaultMessage: 'Default' });
    const defaultProxy: Proxy = proxies?.find((proxy) => proxy.url === DEFAULT_BACKEND_URL) ?? {
      name: defaultName,
      url: DEFAULT_BACKEND_URL,
      region: '',
    };
    if (!proxies || proxies.length === 0) return [defaultProxy];
    const filteredProxies = proxies.filter((proxy) => proxy.url !== DEFAULT_BACKEND_URL);
    return [defaultProxy].concat(filteredProxies || []);
  }, [intl, proxies]);
};
