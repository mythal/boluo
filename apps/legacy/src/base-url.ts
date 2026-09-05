import {
  AUTO_ROUTE_PROBE_INTERVAL_MS,
  MIN_PERFORMANCE_SAMPLES,
  buildRouteProbeTargets,
  type RouteProbeResult,
  type RouteProbeCycle,
  type RouteSelectionDecision,
} from '@boluo/api/route-selection';
import { normalizeProxyUrlForOrigin, originMap } from '@boluo/api/origin-map';
import { withFaroSessionId } from './frontend-telemetry-session';
import { evaluateRoute, measureBaseUrl } from './route-selection';

export { AUTO_ROUTE_PROBE_INTERVAL_MS };

export interface Proxy {
  name: string;
  url: string;
}

const URL_LIST_CACHE_TTL_MS = 60_000;
const URL_LIST_REQUEST_TIMEOUT_MS = 3000;
let urlListCache: { urls: string[]; expiresAt: number } | undefined;

export const getDefaultBaseUrl = (): string => {
  const { origin } = window.location;
  for (const [key, value] of Object.entries(originMap)) {
    if (origin.endsWith(key)) return value;
  }
  return origin;
};

export const getBaseUrlList = async (discoveryUrl = getDefaultBaseUrl()): Promise<string[]> => {
  if (urlListCache && urlListCache.expiresAt > Date.now()) return urlListCache.urls;

  let proxies: Proxy[];
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), URL_LIST_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${discoveryUrl}/api/info/proxies`, {
      ...withFaroSessionId(),
      signal: controller.signal,
    });
    if (!response.ok) return urlListCache?.urls ?? [getDefaultBaseUrl()];
    proxies = (await response.json()) as Proxy[];
  } catch {
    return urlListCache?.urls ?? [getDefaultBaseUrl()];
  } finally {
    window.clearTimeout(timeout);
  }
  const urls = [
    getDefaultBaseUrl(),
    ...proxies.map((proxy) => normalizeProxyUrlForOrigin(proxy.url, window.location.origin)),
  ];
  urlListCache = { urls: [...new Set(urls)], expiresAt: Date.now() + URL_LIST_CACHE_TTL_MS };
  return urlListCache.urls;
};

const inFlightProbeCycles = new Map<string, Promise<Map<string, RouteProbeResult>>>();

const probeRoutes = (activeUrl: string, eligibleUrls: readonly string[]) => {
  const targets = buildRouteProbeTargets(activeUrl, eligibleUrls);
  const key = JSON.stringify(targets);
  const existing = inFlightProbeCycles.get(key);
  if (existing) return existing;

  const cycle = Promise.all(targets.map(async (url) => [url, await measureBaseUrl(url)] as const))
    .then((results) => new Map<string, RouteProbeResult>(results))
    .finally(() => inFlightProbeCycles.delete(key));
  inFlightProbeCycles.set(key, cycle);
  return cycle;
};

type SelectRouteRequest = {
  activeUrl: string;
  connectionState: RouteProbeCycle['connectionState'];
} & (
  | { trigger: 'INITIAL' }
  | { trigger: 'CONNECTION_FAILURE' }
  | { trigger: 'PERIODIC'; selectedAt: number }
);

const selectRoute = async (request: SelectRouteRequest): Promise<RouteSelectionDecision | null> => {
  const { activeUrl, connectionState } = request;
  const eligibleUrls = await getBaseUrlList(activeUrl);
  const results = await probeRoutes(activeUrl, eligibleUrls);
  const activeResult = results.get(activeUrl);
  if (activeResult === undefined) return null;

  const candidateResults = new Map<string, RouteProbeResult>();
  for (const url of eligibleUrls) {
    const result = results.get(url);
    if (url !== activeUrl && result !== undefined) candidateResults.set(url, result);
  }
  const common = {
    activeUrl,
    activeResult,
    candidateResults,
    connectionState,
    now: Date.now(),
  };
  if (request.trigger === 'INITIAL') return evaluateRoute({ ...common, trigger: request.trigger });
  if (request.trigger === 'CONNECTION_FAILURE') {
    return evaluateRoute({ ...common, trigger: request.trigger });
  }
  return evaluateRoute({
    ...common,
    trigger: request.trigger,
    allowPerformanceSwitch: true,
    selectedAt: request.selectedAt,
  });
};

export const selectInitialBaseUrl = async (
  activeUrl: string,
): Promise<RouteSelectionDecision | null> => {
  for (let sample = 0; sample < MIN_PERFORMANCE_SAMPLES; sample++) {
    const decision = await selectRoute({
      activeUrl,
      connectionState: 'DISCONNECTED',
      trigger: 'INITIAL',
    });
    if (decision) return decision;
  }
  return null;
};

export const selectAutomaticBaseUrl = (
  currentUrl: string,
  currentSelectedAt: number,
): Promise<RouteSelectionDecision | null> =>
  selectRoute({
    activeUrl: currentUrl,
    selectedAt: currentSelectedAt,
    connectionState: 'CONNECTED',
    trigger: 'PERIODIC',
  });

export const selectFailoverBaseUrl = async (currentUrl: string): Promise<string | null> => {
  const decision = await selectRoute({
    activeUrl: currentUrl,
    connectionState: 'DISCONNECTED',
    trigger: 'CONNECTION_FAILURE',
  });
  return decision?.url ?? null;
};
