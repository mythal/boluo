import { type Proxy } from '@boluo/api';
import { getDefaultBaseUrl } from '@boluo/api-browser';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import useSWR from 'swr';

const fetcher = async (): Promise<Proxy[]> => {
  try {
    const res = await fetch(`${getDefaultBaseUrl()}/api/info/proxies`);
    const proxies = (await res.json()) as Proxy[];
    return proxies.map((proxy) => {
      // TODO: Remove this hack
      if (proxy.url.endsWith('boluo.chat') && window.location.origin.endsWith('boluochat.com')) {
        return { ...proxy, url: proxy.url.replace('boluo.chat', 'boluochat.com') };
      }
      return proxy;
    });
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
    const defaultUrl = getDefaultBaseUrl();
    const defaultName = intl.formatMessage({ defaultMessage: 'Default' });
    const defaultProxy: Proxy = proxies?.find((proxy) => proxy.url === defaultUrl) ?? {
      name: defaultName,
      url: defaultUrl,
      region: '',
    };
    if (!proxies || proxies.length === 0) return [defaultProxy];
    const filteredProxies = proxies.filter((proxy) => proxy.url !== defaultUrl);
    return [defaultProxy].concat(filteredProxies || []);
  }, [intl, proxies]);
};
