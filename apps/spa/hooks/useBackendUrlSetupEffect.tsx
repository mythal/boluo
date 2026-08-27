import { type Proxy } from '@boluo/api';
import {
  AUTO_ROUTE_PROBE_INTERVAL_MS,
  MIN_PERFORMANCE_SAMPLES,
  buildRouteProbeTargets,
  type RouteProbeCycle,
  type RouteProbeResult,
} from '@boluo/api/route-selection';
import { backendUrlAtom, getDefaultBaseUrl } from '@boluo/api-browser';
import { useAtomValue, useSetAtom, useStore } from 'jotai';
import { useEffect, useRef } from 'react';
import {
  backendUrlChangeReasonAtom,
  backendUrlConfigAtom,
  shouldAutoSelectAtom,
  testProxies,
} from '../base-url';
import { evaluateRoute, toRouteProbeResult } from '../route-selection-state';
import { connectionStateAtom } from '../state/chat.atoms';
import { type ConnectionState } from '../state/connection.reducer';
import { useProxies } from './useProxies';

type RouteChangeReason =
  | 'API_ENDPOINT_CHANGED'
  | 'SPA_FAILOVER_ROUTE_CHANGED'
  | 'SPA_PERFORMANCE_ROUTE_CHANGED';
type InitialSelectionState = 'IDLE' | 'RUNNING' | 'COMPLETE';

interface ProbeCycleResults {
  activeResult: RouteProbeResult;
  candidateResults: Map<string, RouteProbeResult>;
}

const toSelectionConnectionState = (
  state: ConnectionState,
): RouteProbeCycle['connectionState'] => {
  if (state.type === 'CONNECTED') return 'CONNECTED';
  if (state.type === 'ERROR') return 'ERROR';
  return 'DISCONNECTED';
};

const probeRouteCycle = async (
  activeUrl: string,
  proxies: readonly Proxy[],
): Promise<ProbeCycleResults | null> => {
  const proxiesByUrl = new Map(proxies.map((proxy) => [proxy.url, proxy]));
  const targets = buildRouteProbeTargets(activeUrl, [...proxiesByUrl.keys()]).map(
    (url): Proxy => proxiesByUrl.get(url) ?? { name: 'Current', url, region: '' },
  );
  const results = await testProxies(targets);
  const resultsByUrl = new Map(
    results.map((result) => [result.proxy.url, toRouteProbeResult(result.rtt)]),
  );
  const activeResult = resultsByUrl.get(activeUrl);
  if (activeResult === undefined) return null;

  const candidateResults = new Map<string, RouteProbeResult>();
  for (const url of proxiesByUrl.keys()) {
    const result = resultsByUrl.get(url);
    if (url !== activeUrl && result !== undefined) candidateResults.set(url, result);
  }
  return { activeResult, candidateResults };
};

type ProbeCyclePolicy =
  | { trigger: 'INITIAL' }
  | { trigger: 'CONNECTION_FAILURE' }
  | { trigger: 'PERIODIC'; allowPerformanceSwitch: boolean; selectedAt: number };

type CreateProbeCycleInput = {
  activeUrl: string;
  results: ProbeCycleResults;
  connectionState: RouteProbeCycle['connectionState'];
} & ProbeCyclePolicy;

const createProbeCycle = (input: CreateProbeCycleInput): RouteProbeCycle => {
  const common = {
    activeUrl: input.activeUrl,
    activeResult: input.results.activeResult,
    candidateResults: input.results.candidateResults,
    connectionState: input.connectionState,
    now: Date.now(),
  };
  if (input.trigger === 'INITIAL') return { ...common, trigger: input.trigger };
  if (input.trigger === 'CONNECTION_FAILURE') return { ...common, trigger: input.trigger };
  return {
    ...common,
    trigger: input.trigger,
    allowPerformanceSwitch: input.allowPerformanceSwitch,
    selectedAt: input.selectedAt,
  };
};

export const useBackendUrlSetupEffect = () => {
  const proxies = useProxies();
  const shouldAutoSelect = useAtomValue(shouldAutoSelectAtom);
  const setBackendUrl = useSetAtom(backendUrlAtom);
  const setBackendUrlChangeReason = useSetAtom(backendUrlChangeReasonAtom);
  const previousConnectionStateRef = useRef<ConnectionState['type']>('CLOSED');
  const selectedAtRef = useRef(0);
  const initialSelectionStateRef = useRef<InitialSelectionState>('IDLE');
  const store = useStore();

  useEffect(() => {
    let disposed = false;
    let selectionGeneration = 0;
    let ownsInitialRun = false;
    if (selectedAtRef.current === 0) selectedAtRef.current = Date.now();

    const getActiveUrl = () => store.get(backendUrlAtom).trim() || getDefaultBaseUrl();
    const applyRouteDecision = (url: string, reason: RouteChangeReason) => {
      if (store.get(backendUrlAtom).trim() === url) return;
      setBackendUrlChangeReason(reason);
      setBackendUrl(url);
    };

    const probeAndApplyRouteDecision = async (
      trigger: RouteProbeCycle['trigger'] = 'PERIODIC',
      requestedProbeRounds = 1,
    ): Promise<'COMPLETED' | 'STALE'> => {
      const generation = ++selectionGeneration;
      const activeUrl = getActiveUrl();
      const hasCandidate = proxies.some((proxy) => proxy.url !== activeUrl);
      const probeRounds = hasCandidate ? requestedProbeRounds : 1;

      for (let round = 0; round < probeRounds; round++) {
        const results = await probeRouteCycle(activeUrl, proxies);
        if (disposed || generation !== selectionGeneration || getActiveUrl() !== activeUrl) {
          return 'STALE';
        }
        if (!results) return 'COMPLETED';

        const commonCycleInput = {
          activeUrl,
          results,
          connectionState: toSelectionConnectionState(store.get(connectionStateAtom)),
        };
        const cycle =
          trigger === 'PERIODIC'
            ? createProbeCycle({
                ...commonCycleInput,
                trigger,
                allowPerformanceSwitch: shouldAutoSelect,
                selectedAt: selectedAtRef.current,
              })
            : createProbeCycle({ ...commonCycleInput, trigger });
        const decision = evaluateRoute(cycle);
        if (!decision) continue;
        applyRouteDecision(
          decision.url,
          decision.reason === 'FAILOVER'
            ? 'SPA_FAILOVER_ROUTE_CHANGED'
            : 'SPA_PERFORMANCE_ROUTE_CHANGED',
        );
        return 'COMPLETED';
      }
      return 'COMPLETED';
    };

    const unsubscribeBackendUrl = store.sub(backendUrlAtom, () => {
      selectedAtRef.current = Date.now();
      selectionGeneration += 1;
    });
    const subscribeToConnectionChanges = (
      onChange: (previous: ConnectionState['type'], current: ConnectionState) => void,
    ) => {
      previousConnectionStateRef.current = store.get(connectionStateAtom).type;
      return store.sub(connectionStateAtom, () => {
        const current = store.get(connectionStateAtom);
        const previous = previousConnectionStateRef.current;
        previousConnectionStateRef.current = current.type;
        onChange(previous, current);
      });
    };

    if (!shouldAutoSelect) {
      initialSelectionStateRef.current = 'IDLE';
      const configuredUrl = store.get(backendUrlConfigAtom);
      const configuredProxy = proxies.find((proxy) => proxy.url === configuredUrl);
      if (configuredProxy) applyRouteDecision(configuredProxy.url, 'API_ENDPOINT_CHANGED');
      void probeAndApplyRouteDecision();
      const unsubscribeConnection = subscribeToConnectionChanges((previous, current) => {
        if (previous === 'CONNECTED' && current.type !== 'CONNECTED') {
          void probeAndApplyRouteDecision();
        }
      });
      return () => {
        disposed = true;
        selectionGeneration += 1;
        unsubscribeConnection();
        unsubscribeBackendUrl();
      };
    }

    const unsubscribeConnection = subscribeToConnectionChanges((previous, current) => {
      if (
        previous === 'CONNECTED' &&
        current.type !== 'CONNECTED' &&
        current.type !== 'ERROR' &&
        current.retry > 2
      ) {
        void probeAndApplyRouteDecision('CONNECTION_FAILURE');
      }
    });

    const hasCandidate = proxies.some((proxy) => proxy.url !== getActiveUrl());
    if (initialSelectionStateRef.current === 'IDLE' && hasCandidate) {
      initialSelectionStateRef.current = 'RUNNING';
      ownsInitialRun = true;
      void probeAndApplyRouteDecision('INITIAL', MIN_PERFORMANCE_SAMPLES).then((status) => {
        if (!disposed && status === 'COMPLETED') initialSelectionStateRef.current = 'COMPLETE';
      });
    } else {
      void probeAndApplyRouteDecision();
    }
    const timer = window.setInterval(() => {
      void probeAndApplyRouteDecision();
    }, AUTO_ROUTE_PROBE_INTERVAL_MS);

    return () => {
      disposed = true;
      if (ownsInitialRun && initialSelectionStateRef.current === 'RUNNING') {
        initialSelectionStateRef.current = 'IDLE';
      }
      selectionGeneration += 1;
      window.clearInterval(timer);
      unsubscribeConnection();
      unsubscribeBackendUrl();
    };
  }, [proxies, setBackendUrl, setBackendUrlChangeReason, shouldAutoSelect, store]);
};
