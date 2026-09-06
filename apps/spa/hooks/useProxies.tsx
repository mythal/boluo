import {
  type FetchFailError,
  type NotJsonError,
  type Proxy,
  type UnexpectedError,
} from '@boluo/api';
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
  let res: Response;
  try {
    res = await fetch(`${getDefaultBaseUrl()}/api/info/proxies`, withFaroSessionId());
  } catch (cause) {
    const error: FetchFailError = { code: 'FETCH_FAIL', cause };
    throw error;
  }
  if (!res.ok) {
    const error: UnexpectedError = {
      code: 'UNEXPECTED',
      message: `Failed to fetch proxies: ${res.status} ${res.statusText}`,
      context: null,
    };
    throw error;
  }
  let body: string;
  try {
    body = await res.text();
  } catch (cause) {
    const error: FetchFailError = { code: 'FETCH_FAIL', cause };
    throw error;
  }
  let data: unknown;
  try {
    data = JSON.parse(body);
  } catch (cause) {
    const error: NotJsonError = { code: 'NOT_JSON', cause, body };
    throw error;
  }
  const result = (await proxyListSchemaPromise).safeParse(data);
  if (!result.success) {
    const error: UnexpectedError = {
      code: 'UNEXPECTED',
      message: 'Invalid proxy list response',
      context: result.error,
    };
    throw error;
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
