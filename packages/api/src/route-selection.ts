export type RouteProbeResult = number | 'FAILED' | 'TIMEOUT' | 'ERROR';

export interface RouteStats {
  readonly ema: number;
  readonly lastDelay: number;
  readonly successRate: number;
  readonly lastUpdate: number;
  readonly sampleCount: number;
  readonly consecutiveSuccesses: number;
  readonly consecutiveFailures: number;
  readonly cooldownUntil: number;
}

export interface RouteSelectionDecision {
  url: string;
  reason: 'PERFORMANCE' | 'FAILOVER';
}

export interface RouteSelectionState {
  readonly stats: ReadonlyMap<string, RouteStats>;
}

interface RouteProbeCycleBase {
  activeUrl: string;
  activeResult: RouteProbeResult;
  candidateResults: ReadonlyMap<string, RouteProbeResult>;
  connectionState: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  now: number;
}

export type RouteProbeCycle =
  | (RouteProbeCycleBase & { trigger: 'INITIAL' })
  | (RouteProbeCycleBase & {
      trigger: 'PERIODIC';
      allowPerformanceSwitch: boolean;
      selectedAt: number;
    })
  | (RouteProbeCycleBase & { trigger: 'CONNECTION_FAILURE' });

export type RouteSelectionAction = {
  type: 'PROBE_RECORDED';
  url: string;
  result: RouteProbeResult;
  now: number;
};

export interface RouteSelectionTransition {
  state: RouteSelectionState;
  decision: RouteSelectionDecision | null;
}

export const AUTO_ROUTE_PROBE_INTERVAL_MS = 30_000;
export const MIN_PERFORMANCE_ROUTE_DWELL_MS = 120_000;
export const MIN_PERFORMANCE_SAMPLES = 3;
export const MIN_PERFORMANCE_IMPROVEMENT_MS = 100;
export const MIN_PERFORMANCE_IMPROVEMENT_RATIO = 0.3;
export const FAILED_ROUTE_COOLDOWN_MS = 60_000;

const EMA_ALPHA = 0.05;
const FAILED_PROBE_DELAY_MS = 5000;
const ROUTE_SCORE_FULL_CONFIDENCE_SAMPLES = 5;
const ROUTE_SCORE_MISSING_SAMPLE_PENALTY_MS = 200;
const ROUTE_SCORE_UNRELIABILITY_PENALTY_MS = 2000;
const ROUTE_SCORE_STALE_PENALTY_MS = 1000;

const isSuccess = (result: RouteProbeResult): result is number => typeof result === 'number';

export const buildRouteProbeTargets = (
  activeUrl: string,
  eligibleUrls: readonly string[],
): string[] => [...new Set([activeUrl, ...eligibleUrls])];

export const createRouteSelectionState = (): RouteSelectionState => ({ stats: new Map() });

const applyProbe = (
  stats: Map<string, RouteStats>,
  url: string,
  result: RouteProbeResult,
  now: number,
): void => {
  const success = isSuccess(result);
  const previous = stats.get(url);
  const delay = success ? result : FAILED_PROBE_DELAY_MS;
  if (!previous) {
    stats.set(url, {
      ema: delay,
      lastDelay: delay,
      successRate: success ? 1 : 0,
      lastUpdate: now,
      sampleCount: 1,
      consecutiveSuccesses: success ? 1 : 0,
      consecutiveFailures: success ? 0 : 1,
      cooldownUntil: 0,
    });
    return;
  }

  stats.set(url, {
    ema: EMA_ALPHA * delay + (1 - EMA_ALPHA) * previous.ema,
    lastDelay: success ? result : previous.lastDelay,
    successRate: EMA_ALPHA * (success ? 1 : 0) + (1 - EMA_ALPHA) * previous.successRate,
    lastUpdate: now,
    sampleCount: previous.sampleCount + 1,
    consecutiveSuccesses: success ? previous.consecutiveSuccesses + 1 : 0,
    consecutiveFailures: success ? 0 : previous.consecutiveFailures + 1,
    cooldownUntil: previous.cooldownUntil,
  });
};

export const routeSelectionReducer = (
  state: RouteSelectionState,
  action: RouteSelectionAction,
): RouteSelectionState => {
  const stats = new Map(state.stats);
  applyProbe(stats, action.url, action.result, action.now);
  return { stats };
};

export const reduceRouteProbeCycle = (
  state: RouteSelectionState,
  cycle: RouteProbeCycle,
): RouteSelectionTransition => {
  const stats = new Map(state.stats);
  applyProbe(stats, cycle.activeUrl, cycle.activeResult, cycle.now);
  for (const [url, result] of cycle.candidateResults) {
    if (url !== cycle.activeUrl) applyProbe(stats, url, result, cycle.now);
  }

  const nextState = { stats };
  const candidates = [...cycle.candidateResults]
    .filter(([url, result]) => {
      if (url === cycle.activeUrl || !isSuccess(result)) return false;
      return (stats.get(url)?.cooldownUntil ?? 0) <= cycle.now;
    })
    .map(([url]) => [url, stats.get(url)!] as const);
  if (candidates.length === 0) return { state: nextState, decision: null };

  const activeStats = stats.get(cycle.activeUrl)!;
  const shouldFailover =
    cycle.trigger === 'CONNECTION_FAILURE' ||
    (!isSuccess(cycle.activeResult) &&
      (cycle.connectionState !== 'CONNECTED' || activeStats.consecutiveFailures >= 2));
  if (shouldFailover) {
    const candidate = candidates.sort((left, right) => {
      if (left[1].successRate !== right[1].successRate) {
        return right[1].successRate - left[1].successRate;
      }
      return left[1].ema - right[1].ema;
    })[0]!;
    stats.set(cycle.activeUrl, {
      ...activeStats,
      cooldownUntil: Math.max(activeStats.cooldownUntil, cycle.now + FAILED_ROUTE_COOLDOWN_MS),
    });
    return {
      state: nextState,
      decision: { url: candidate[0], reason: 'FAILOVER' },
    };
  }

  const allowPerformanceSwitch =
    cycle.trigger === 'INITIAL' || (cycle.trigger === 'PERIODIC' && cycle.allowPerformanceSwitch);
  if (!allowPerformanceSwitch || !isSuccess(cycle.activeResult)) {
    return { state: nextState, decision: null };
  }
  if (
    cycle.trigger === 'PERIODIC' &&
    cycle.now - cycle.selectedAt < MIN_PERFORMANCE_ROUTE_DWELL_MS
  ) {
    return { state: nextState, decision: null };
  }
  const candidate = candidates
    .filter(
      ([, candidateStats]) =>
        candidateStats.consecutiveSuccesses >= MIN_PERFORMANCE_SAMPLES &&
        candidateStats.sampleCount >= MIN_PERFORMANCE_SAMPLES,
    )
    .sort((left, right) => left[1].ema - right[1].ema)[0];
  if (!candidate) return { state: nextState, decision: null };

  const improvement = activeStats.ema - candidate[1].ema;
  const requiredImprovement = Math.max(
    MIN_PERFORMANCE_IMPROVEMENT_MS,
    activeStats.ema * MIN_PERFORMANCE_IMPROVEMENT_RATIO,
  );
  const decision =
    improvement >= requiredImprovement
      ? { url: candidate[0], reason: 'PERFORMANCE' as const }
      : null;
  return { state: nextState, decision };
};

export const getRouteStats = (state: RouteSelectionState, url: string): RouteStats | undefined => {
  const stats = state.stats.get(url);
  return stats ? { ...stats } : undefined;
};

export const getRouteScore = (state: RouteSelectionState, url: string, now: number): number => {
  const stats = state.stats.get(url);
  if (!stats) return 10_000;
  let score = stats.ema + (1 - stats.successRate) * ROUTE_SCORE_UNRELIABILITY_PENALTY_MS;
  if (stats.sampleCount < ROUTE_SCORE_FULL_CONFIDENCE_SAMPLES) {
    score +=
      (ROUTE_SCORE_FULL_CONFIDENCE_SAMPLES - stats.sampleCount) *
      ROUTE_SCORE_MISSING_SAMPLE_PENALTY_MS;
  }
  if (now - stats.lastUpdate > AUTO_ROUTE_PROBE_INTERVAL_MS) {
    score += ROUTE_SCORE_STALE_PENALTY_MS;
  }
  return score;
};

export const createRouteSelectionStore = () => {
  let state = createRouteSelectionState();
  return {
    evaluate(cycle: RouteProbeCycle): RouteSelectionDecision | null {
      const transition = reduceRouteProbeCycle(state, cycle);
      state = transition.state;
      return transition.decision;
    },
    record(url: string, result: RouteProbeResult, now = Date.now()): void {
      state = routeSelectionReducer(state, { type: 'PROBE_RECORDED', url, result, now });
    },
    getStats(url: string): RouteStats | undefined {
      return getRouteStats(state, url);
    },
    getScore(url: string, now = Date.now()): number {
      return getRouteScore(state, url, now);
    },
  };
};
