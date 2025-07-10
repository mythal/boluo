import { backendUrlAtom } from '@boluo/api-browser';
import { useAtomValue, useSetAtom, useStore } from 'jotai';
import { useProxies } from './useProxies';
import {
  backendUrlConfigAtom,
  type BaseUrlTestResult,
  shouldAutoSelectAtom,
  testProxies,
  testProxy,
  TIMEOUT,
} from '../base-url';
import { useEffect, useRef } from 'react';
import { type Proxy } from '@boluo/api';
import { connectionStateAtom } from '../state/chat.atoms';
import { type ConnectionState } from '../state/connection.reducer';
import { updateRouteStats, getRouteScore, convertTestResult } from './useRouteMovingAverage';

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

      // Update EMA statistics for all tested routes
      result.forEach((record) => {
        const measureResult = convertTestResult(record.rtt);
        updateRouteStats(record.proxy.url, measureResult);
      });

      setBackendUrl((prev) => {
        const withScores: ResultWithScore[] = result.map((record) => {
          if (record.rtt === 'FAILED' || record.rtt === 'TIMEOUT') {
            // Use EMA score even for failed routes
            const emaScore = getRouteScore(record.proxy.url);
            return { ...record, score: -emaScore }; // Negative because lower EMA score is better
          }

          const emaScore = getRouteScore(record.proxy.url);
          const extraScore = prev === record.proxy.url ? EXTRA_SCORE_FOR_PREVIOUS : 0;

          // Lower EMA score is better, so we negate it and add extra score
          return { ...record, score: -emaScore + extraScore };
        });

        if (withScores.length === 0) return prev;
        const best = withScores.reduce(
          (bestSoFar, record) => (bestSoFar.score > record.score ? bestSoFar : record),
          withScores[0]!,
        );

        // Check if the best route has a reasonable EMA score
        const bestEmaScore = getRouteScore(best.proxy.url);
        if (bestEmaScore > 10000) {
          alert('Network is not stable, please try again later');
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

      // Update EMA statistics for the single proxy test
      const measureResult = convertTestResult(result.rtt);
      updateRouteStats(proxy.url, measureResult);

      if (result.rtt === 'FAILED' || result.rtt === 'TIMEOUT') {
        selectBest();
      } else {
        setBackendUrl(proxy.url);
      }
    };
    if (!shouldAutoSelect) {
      const backendUrlConfig = store.get(backendUrlConfigAtom);
      const proxyFromConfig = proxies.find((proxy) => proxy.url === backendUrlConfig);
      if (!proxyFromConfig) {
        selectBest();
      } else {
        setBackendUrl(proxyFromConfig.url);
        void testOrSelectBest(proxyFromConfig);
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
