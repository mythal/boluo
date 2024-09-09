import { backendUrlAtom } from '@boluo/api-browser';
import { useAtomValue, useSetAtom } from 'jotai';
import { useProxies } from './useProxies';
import { type BaseUrlTestResult, shouldAutoSelectAtom, testProxies, TIMEOUT } from '../base-url';
import { useEffect } from 'react';

type ResultWithScore = BaseUrlTestResult & { score: number };

const EXTRA_SCORE_FOR_PREVIOUS = 100;

export const useAutoSelectProxy = (interval: number) => {
  const proxies = useProxies();
  const shouldAutoSelect = useAtomValue(shouldAutoSelectAtom);
  const setBackendUrl = useSetAtom(backendUrlAtom);
  useEffect(() => {
    if (!shouldAutoSelect) return;
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
    const timer = setInterval(selectBest, interval);
    return () => clearInterval(timer);
  }, [interval, proxies, setBackendUrl, shouldAutoSelect]);
};
