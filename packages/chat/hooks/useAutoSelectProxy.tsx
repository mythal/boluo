import { Proxy } from '@boluo/api';
import { backendUrlAtom } from '@boluo/api-browser';
import { useAtomValue, useSetAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import useSWR from 'swr';
import { sleep } from '@boluo/utils';
import { useProxies } from './useProxies';

const timeout = async (): Promise<'TIMEOUT'> => {
  await sleep(1500);
  return 'TIMEOUT';
};

export interface ProxyTestResult {
  proxy: Proxy;
  result: number | 'FAILED' | 'TIMEOUT';
}

const proxyTimer = async (proxy: Proxy): Promise<ProxyTestResult> => {
  const { url } = proxy;
  const now = performance.now();

  try {
    const result = await Promise.race([fetch(url + '/api/info'), timeout()]);
    if (result === 'TIMEOUT') {
      return { proxy, result: 'TIMEOUT' };
    } else {
      if (result.status !== 200) {
        return { proxy, result: 'FAILED' };
      }
    }
  } catch (e) {
    return { proxy, result: 'FAILED' };
  }
  return { proxy, result: performance.now() - now };
};

const tester = async (proxies: Proxy[]): Promise<ProxyTestResult[]> => {
  return await Promise.all(proxies.map(proxyTimer));
};

export const shouldAutoSelectAtom = atomWithStorage('boluo-should-auto-select', true);

export const useAutoSelectProxy = (interval: number) => {
  const proxies = useProxies();
  const shouldAutoSelect = useAtomValue(shouldAutoSelectAtom);
  const setBackendUrl = useSetAtom(backendUrlAtom);
  const onSuccess = (result: ProxyTestResult[]) => {
    let best: ProxyTestResult | undefined;
    for (const item of result) {
      if (item.result === 'FAILED' || item.result === 'TIMEOUT') {
        continue;
      }
      if (!best) best = item;
      if (typeof best.result === 'number' && item.result < best.result) {
        best = item;
      }
    }
    if (best) {
      const bestUrl = best.proxy.url;
      setBackendUrl((prev) => {
        if (prev === bestUrl) {
          return prev;
        }
        console.log('Auto select proxy: ', bestUrl);
        return bestUrl;
      });
    }
  };
  const { data: result } = useSWR(['test-proxies', proxies], () => tester(proxies), {
    onSuccess: shouldAutoSelect ? onSuccess : undefined,
    refreshInterval: interval,
    fallbackData: [],
    suspense: false,
  });
  return result;
};
