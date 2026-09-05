import { type Proxy } from '@boluo/api';
import { normalizeProxyUrlForOrigin } from '@boluo/api/origin-map';
import { getDefaultBaseUrl, withFaroSessionId } from '@boluo/api-browser';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import useSWR from 'swr';

const proxyListSchemaPromise = import('zod/mini').then((z) =>
  z.array(
    z.object({
      name: z.string(),
      url: z.string(),
      region: z.string(),
    }),
  ),
);

const fetcher = async (): Promise<Proxy[]> => {
  const res = await fetch(`${getDefaultBaseUrl()}/api/info/proxies`, withFaroSessionId());
  if (!res.ok) {
    throw new Error(`Failed to fetch proxies: ${res.status} ${res.statusText}`);
  }
  const result = (await proxyListSchemaPromise).safeParse(await res.json());
  if (!result.success) {
    throw new Error('Invalid proxy list response', { cause: result.error });
  }
  return result.data.map((proxy) => ({
    ...proxy,
    url: normalizeProxyUrlForOrigin(proxy.url, window.location.origin),
  }));
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
