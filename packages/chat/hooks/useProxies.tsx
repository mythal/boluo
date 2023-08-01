import { Proxy } from 'api';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import useSWR from 'swr';

const fetcher = async (): Promise<Proxy[]> => {
  const res = await fetch('/api/info/proxies');
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
    const defaultProxies: Proxy[] = [
      { name: intl.formatMessage({ defaultMessage: 'Default' }), url: location.origin, region: '' },
      // { name: intl.formatMessage({ defaultMessage: 'Dummy' }), url: 'example.com', region: 'Global' },
    ];
    return defaultProxies.concat(proxies || []);
  }, [intl, proxies]);
};
