import { type Proxy } from '@boluo/api';
import { timeout } from '@boluo/utils/async';
import { atomWithStorage } from 'jotai/utils';
import { IS_DEVELOPMENT } from './const';
import { atom } from 'jotai';

export interface BaseUrlTestResult {
  proxy: Proxy;
  rtt: number | 'FAILED' | 'TIMEOUT';
}
export const TIMEOUT = 1500;

export const testProxy = async (proxy: Proxy): Promise<BaseUrlTestResult> => {
  const { url } = proxy;
  const now = performance.now();

  try {
    const rtt = await Promise.race([fetch(url + '/api/info'), timeout(TIMEOUT)]);
    if (rtt === 'TIMEOUT') {
      return { proxy, rtt: 'TIMEOUT' };
    } else {
      if (rtt.status !== 200) {
        return { proxy, rtt: 'FAILED' };
      }
    }
  } catch (e) {
    return { proxy, rtt: 'FAILED' };
  }
  const rtt = performance.now() - now;
  return { proxy, rtt };
};

export const testProxies = async (proxies: Proxy[]): Promise<BaseUrlTestResult[]> => {
  return Promise.all(proxies.map(testProxy));
};

export const backendUrlConfigAtom = atomWithStorage(
  'boluo-backend-config-v1',
  IS_DEVELOPMENT ? '' : 'auto',
);

export const shouldAutoSelectAtom = atom((get) => get(backendUrlConfigAtom) === 'auto');
