import {
  createRouteSelectionStore,
  type RouteProbeCycle,
  type RouteProbeResult,
  type RouteSelectionDecision,
  type RouteStats,
} from '@boluo/api/route-selection';
import { withFaroSessionId } from './frontend-telemetry';

export type MeasureResult = Extract<RouteProbeResult, number | 'TIMEOUT' | 'ERROR'>;

const BASE_URL_PROBE_TIMEOUT_MS = 3000;
const routeSelection = createRouteSelectionStore();

export const measureBaseUrl = async (url: string): Promise<MeasureResult> => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), BASE_URL_PROBE_TIMEOUT_MS);
  const start = performance.now();
  try {
    const result = await fetch(url + '/api/info', {
      ...withFaroSessionId(),
      signal: controller.signal,
    });
    return result.ok ? performance.now() - start : 'ERROR';
  } catch (error) {
    return error instanceof DOMException && error.name === 'AbortError' ? 'TIMEOUT' : 'ERROR';
  } finally {
    window.clearTimeout(timeout);
  }
};

export const probeBaseUrl = async (url: string): Promise<MeasureResult> => {
  const result = await measureBaseUrl(url);
  routeSelection.record(url, result);
  return result;
};

export const evaluateRoute = (cycle: RouteProbeCycle): RouteSelectionDecision | null =>
  routeSelection.evaluate(cycle);

export const getRouteScore = (url: string): number => routeSelection.getScore(url);
export const getRouteStats = (url: string): RouteStats | undefined => routeSelection.getStats(url);
