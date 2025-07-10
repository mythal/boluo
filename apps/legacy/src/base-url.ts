import { getRouteScore, getAllRouteStats } from './hooks/useBaseUrlMovingAverage';

export interface Proxy {
  name: string;
  url: string;
}

let urlListCache: string[] = [];

export const getBaseUrlList = async (): Promise<string[]> => {
  if (urlListCache.length > 0) {
    return urlListCache;
  }
  const response = await fetch(`${getDefaultBaseUrl()}/api/info/proxies`);
  const proxies = (await response.json()) as Proxy[];
  const urls = [getDefaultBaseUrl(), ...proxies.map((proxy) => proxy.url)];
  urlListCache = urls;
  return urls;
};

const FAILED = Number.MAX_SAFE_INTEGER;

export const getDefaultBaseUrl = (): string => {
  // eslint-disable-next-line no-restricted-globals
  const BASE_URL = process.env.PUBLIC_BACKEND_URL;
  if (typeof BASE_URL === 'string') {
    return BASE_URL;
  }
  return location.origin;
};

const timeout = (ms: number): Promise<'TIMEOUT'> => {
  return new Promise((resolve) => {
    window.setTimeout(() => {
      resolve('TIMEOUT');
    }, ms);
  });
};

const testBaseUrl = async (baseUrl: string): Promise<number> => {
  const start = performance.now();
  try {
    const response = await Promise.race([fetch(baseUrl + '/api/info'), timeout(1000)]);
    if (response === 'TIMEOUT') {
      return FAILED;
    }
    if (response.status > 299) {
      return FAILED;
    }
  } catch {
    return FAILED;
  }
  const end = performance.now();
  return end - start;
};

export const selectBestBaseUrl = async (block?: string): Promise<string> => {
  const baseUrlList = await getBaseUrlList();
  const list = baseUrlList.filter((url) => url !== block);

  console.log(`🔍 Auto route selection started (excluding: ${block || 'none'})`);

  // Use moving average scores instead of real-time measurements for route selection
  let bestUrl = list[0];
  let bestScore = getRouteScore(bestUrl);

  // Collect all route scores for logging
  const routeScores: Array<{ url: string; score: number }> = [];

  for (let i = 0; i < list.length; i++) {
    const url = list[i];
    const score = getRouteScore(url);
    routeScores.push({ url, score });

    if (score < bestScore) {
      bestUrl = url;
      bestScore = score;
    }
  }

  // Sort by score and log results
  routeScores.sort((a, b) => a.score - b.score);
  console.log('📊 Route ranking by score (based on moving average):');
  routeScores.forEach((item, index) => {
    const stats = getAllRouteStats().get(item.url);
    const isSelected = item.url === bestUrl;
    console.log(
      `${isSelected ? '✅' : '  '} ${index + 1}. ${item.url} ` +
        `(Score: ${item.score.toFixed(0)}, ` +
        `Moving Avg: ${stats?.ema.toFixed(1) || 'N/A'}ms, ` +
        `Success Rate: ${stats ? (stats.successRate * 100).toFixed(1) : 'N/A'}%)`,
    );
  });

  // If best route score is too high (>3000ms), fallback to real-time measurement
  if (bestScore > 3000) {
    console.warn(
      '⚠️ All route moving average scores too high, falling back to real-time measurement',
    );
    const responseMsList = await Promise.all(list.map((url) => testBaseUrl(url)));
    let bestIndex = 0;
    let bestMs = responseMsList[0];
    for (let i = 1; i < responseMsList.length; i++) {
      const ms = responseMsList[i];
      if (ms < bestMs && ms !== FAILED) {
        bestIndex = i;
        bestMs = ms;
      }
    }
    console.log(`🚨 Real-time measurement selection: ${list[bestIndex]} (${bestMs.toFixed(0)}ms)`);
    return list[bestIndex];
  }

  console.log(`🎯 Final selection: ${bestUrl} (Score: ${bestScore.toFixed(0)})`);
  return bestUrl;
};
