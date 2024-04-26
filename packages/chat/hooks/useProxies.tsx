import { Proxy } from '@boluo/api';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import useSWR from 'swr';

const DEFAULT_BACKEND_URL =
  process.env.PUBLIC_BACKEND_URL || (typeof window === 'undefined' ? '' : window.location.origin);

const fetcher = async (): Promise<Proxy[]> => {
  const res = await fetch(`${DEFAULT_BACKEND_URL}/api/info/proxies`);
  return (await res.json()) as Proxy[];
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
    const defaultProxies: Proxy[] = [
      {
        name: intl.formatMessage({ defaultMessage: 'Default' }),
        url: DEFAULT_BACKEND_URL,
        region: '',
      },
      // { name: intl.formatMessage({ defaultMessage: 'Dummy' }), url: 'example.com', region: 'Global' },
    ];
    return defaultProxies.concat(proxies || []);
  }, [intl, proxies]);
};
