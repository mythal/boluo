/**
 * Exponential Moving Average (EMA)
 *
 * Algorithm features:
 * - EMA α = 0.05, equivalent to ~40 data points moving average (2 minutes @ 3-second intervals)
 * - Routes with low success rates receive additional penalties
 * - New routes or routes with insufficient samples have initial penalties
 * - Timeout routes have time-decay penalties
 */

import useSWR from 'swr';

export type MeasureResult = number | 'TIMEOUT' | 'ERROR';

// Exponential Moving Average (EMA) parameters
// α = 2 / (N + 1), where N is the equivalent simple moving average period
// For 2-minute moving average with 3-second measurement intervals, equivalent to 40 data points
// α ≈ 0.05 gives more weight to historical data, reducing fluctuations
const EMA_ALPHA = 0.05;

// Success rate weight factor, routes with low success rates receive additional penalties
const SUCCESS_RATE_WEIGHT = 2.0;

// Route latency statistics data
interface RouteStats {
  ema: number; // Exponential moving average latency
  lastDelay: number; // Latest latency
  successRate: number; // Success rate (EMA)
  lastUpdate: number; // Last update timestamp
  sampleCount: number; // Sample count
}

// Global route statistics storage
const routeStatsMap = new Map<string, RouteStats>();

const sleep = (ms: number): Promise<'TIMEOUT'> => {
  return new Promise((resolve) => {
    window.setTimeout(() => {
      resolve('TIMEOUT');
    }, ms);
  });
};

const measure = async (url: string): Promise<MeasureResult> => {
  const start = performance.now();
  try {
    const result = await Promise.race([fetch(url + '/api/info'), sleep(1000)]);
    if (result === 'TIMEOUT') {
      return result;
    }
    if (!result.ok) {
      return 'ERROR';
    }
  } catch {
    return 'ERROR';
  }
  const end = performance.now();
  return end - start;
};

// Update route statistics data
const updateRouteStats = (url: string, result: MeasureResult): void => {
  const now = Date.now();
  let stats = routeStatsMap.get(url);

  if (!stats) {
    // Initialize statistics for new route
    if (typeof result === 'number') {
      stats = {
        ema: result,
        lastDelay: result,
        successRate: 1.0,
        lastUpdate: now,
        sampleCount: 1,
      };
    } else {
      // If first measurement fails, use high penalty latency
      stats = {
        ema: 5000,
        lastDelay: 5000,
        successRate: 0.0,
        lastUpdate: now,
        sampleCount: 1,
      };
    }
    routeStatsMap.set(url, stats);
    return;
  }

  // Update statistics
  const isSuccess = typeof result === 'number';
  const delay = isSuccess ? result : 5000; // Use penalty latency for failures

  // Update EMA latency
  stats.ema = EMA_ALPHA * delay + (1 - EMA_ALPHA) * stats.ema;

  // Update success rate (EMA)
  const successValue = isSuccess ? 1.0 : 0.0;
  stats.successRate = EMA_ALPHA * successValue + (1 - EMA_ALPHA) * stats.successRate;

  // Update other fields
  stats.lastDelay = typeof result === 'number' ? result : stats.lastDelay;
  stats.lastUpdate = now;
  stats.sampleCount += 1;
};

// Get route selection score (lower is better)
export const getRouteScore = (url: string): number => {
  const stats = routeStatsMap.get(url);
  if (!stats) {
    return 10000; // Give unknown routes a very high score
  }

  // Base score = EMA latency
  let score = stats.ema;

  // Success rate penalty: routes with low success rates get additional latency
  const successRatePenalty = (1 - stats.successRate) * SUCCESS_RATE_WEIGHT * 1000;
  score += successRatePenalty;

  // Insufficient data penalty: routes with less than 5 samples get penalties
  if (stats.sampleCount < 5) {
    score += (5 - stats.sampleCount) * 200;
  }

  // Timeout penalty: routes that haven't updated recently get temporary penalties
  const timeSinceUpdate = Date.now() - stats.lastUpdate;
  if (timeSinceUpdate > 30000) {
    // No update within 30 seconds
    score += 1000;
  }

  return score;
};

// Get all route statistics (for debugging)
export const getAllRouteStats = (): Map<string, RouteStats> => {
  return new Map(routeStatsMap);
};

// Reset statistics for a specific route
export const resetRouteStats = (url: string): void => {
  routeStatsMap.delete(url);
};

// Hook for UI display (returns latest latency)
export const useBaseUrlDelay = (baseUrl: string): MeasureResult | 'LOADING' => {
  const { data } = useSWR([baseUrl, 'measure'], () => measure(baseUrl), {
    refreshInterval: 3000,
    onSuccess: (result) => {
      // Update moving average data after successful measurement
      updateRouteStats(baseUrl, result);
    },
    onError: () => {
      // Update statistics even after measurement failure
      updateRouteStats(baseUrl, 'ERROR');
    },
  });

  if (!data) {
    return 'LOADING';
  } else {
    return data;
  }
};

// Get moving average latency (for route selection)
export const getRouteMovingAverage = (url: string): number => {
  const stats = routeStatsMap.get(url);
  return stats ? stats.ema : 10000;
};

// Get success rate
export const getRouteSuccessRate = (url: string): number => {
  const stats = routeStatsMap.get(url);
  return stats ? stats.successRate : 0;
};
