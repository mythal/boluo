import {
  createRouteSelectionStore,
  type RouteProbeCycle,
  type RouteProbeResult,
  type RouteSelectionDecision,
} from '@boluo/api/route-selection';
import { type BaseUrlTestResult } from './base-url';

export type MeasureResult = Exclude<RouteProbeResult, 'ERROR'>;

const routeSelection = createRouteSelectionStore();

export const evaluateRoute = (cycle: RouteProbeCycle): RouteSelectionDecision | null =>
  routeSelection.evaluate(cycle);

export const recordRouteProbe = (url: string, result: MeasureResult): void => {
  routeSelection.record(url, result);
};

export const getRouteScore = (url: string): number => routeSelection.getScore(url);

export const toRouteProbeResult = (result: BaseUrlTestResult['rtt']): MeasureResult => result;
