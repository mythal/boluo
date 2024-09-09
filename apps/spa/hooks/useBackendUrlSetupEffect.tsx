import { backendUrlAtom } from '@boluo/api-browser';
import { useAtomValue, useSetAtom, useStore } from 'jotai';
import { useProxies } from './useProxies';
import {
  type BaseUrlTestResult,
  getBaseUrlFromStorage,
  shouldAutoSelectAtom,
  testProxies,
  testProxy,
  TIMEOUT,
} from '../base-url';
import { useEffect, useRef } from 'react';
import { type Proxy } from '@boluo/api';
import { connectionStateAtom } from '../state/chat.atoms';
import { type ConnectionState } from '../state/connection.reducer';

type ResultWithScore = BaseUrlTestResult & { score: number };

const EXTRA_SCORE_FOR_PREVIOUS = 100;
const INTERVAL = 30 * 1000;

export const useBackendUrlSetupEffect = () => {
  const proxies = useProxies();
  const shouldAutoSelect = useAtomValue(shouldAutoSelectAtom);
  const setBackendUrl = useSetAtom(backendUrlAtom);
  const prevConnectionStateType = useRef<ConnectionState['type']>('CLOSED');
  const store = useStore();
  useEffect(() => {
    const onSuccess = (result: BaseUrlTestResult[] | null) => {
      if (!result) return;
      setBackendUrl((prev) => {
        const withScores: ResultWithScore[] = result.map((record) => {
          if (record.rtt === 'FAILED' || record.rtt === 'TIMEOUT') {
            return { ...record, score: 0 };
          }
          const extraScore = prev === record.proxy.url ? EXTRA_SCORE_FOR_PREVIOUS : 0;
          return { ...record, score: TIMEOUT - record.rtt + extraScore };
        });
        if (withScores.length === 0) return prev;
        const best = withScores.reduce(
          (bestSoFar, record) => (bestSoFar.score > record.score ? bestSoFar : record),
          withScores[0]!,
        );
        if (best.score <= 0) {
          // TODO: notify user
          return prev;
        }
        return best.proxy.url;
      });
    };
    const selectBest = () => {
      void testProxies(proxies).then(onSuccess);
    };
    const testOrSelectBest = async (proxy: Proxy) => {
      const result = await testProxy(proxy);
      if (result.rtt === 'FAILED' || result.rtt === 'TIMEOUT') {
        selectBest();
      } else {
        setBackendUrl(proxy.url);
      }
    };
    if (!shouldAutoSelect) {
      const baseUrlFromStorage = getBaseUrlFromStorage();
      const proxyFromStorage = proxies.find((proxy) => proxy.url === baseUrlFromStorage);
      if (!proxyFromStorage) {
        selectBest();
      } else {
        setBackendUrl(proxyFromStorage.url);
        void testOrSelectBest(proxyFromStorage);
      }
      return;
    } else {
      const unsub = store.sub(connectionStateAtom, () => {
        const connectionState = store.get(connectionStateAtom);
        if (
          prevConnectionStateType.current === 'CONNECTED' &&
          connectionState.type !== 'CONNECTED' &&
          connectionState.type !== 'ERROR' &&
          connectionState.retry > 2
        ) {
          selectBest();
        }
        prevConnectionStateType.current = connectionState.type;
      });
      const timer = setInterval(selectBest, INTERVAL);
      return () => {
        clearInterval(timer);
        unsub();
      };
    }
  }, [proxies, setBackendUrl, shouldAutoSelect, store]);
};
