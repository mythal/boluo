import { getRouteScore, getAllRouteStats } from './hooks/useBaseUrlMovingAverage';
import { originMap } from '@boluo/api/origin-map';

export interface Proxy {
  name: string;
  url: string;
}

const urlListCache: string[] = [];

export const getBaseUrlList = async (): Promise<string[]> => {
  if (urlListCache.length > 0) {
    return urlListCache;
  }
  const response = await fetch(`${getDefaultBaseUrl()}/api/info/proxies`);
  const proxies = (await response.json()) as Proxy[];
  const urls = [
    getDefaultBaseUrl(),
    ...proxies.map((proxy) => {
      // TODO: Remove this hack
      if (proxy.url.endsWith('boluo.chat') && window.location.origin.endsWith('boluochat.com')) {
        // Replace boluo.chat with boluochat.com
        return proxy.url.replace('boluo.chat', 'boluochat.com');
      } else {
        return proxy.url;
      }
    }),
  ];
  return urls;
};

const FAILED = Number.MAX_SAFE_INTEGER;

export const getDefaultBaseUrl = (): string => {
  const { origin } = window.location;
  for (const [key, value] of Object.entries(originMap)) {
    if (origin.endsWith(key)) {
      return value;
    }
  }
  console.warn('Unknown origin, using location.origin', origin);
  return origin;
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

  // If best route score is too high (>3000ms), fallback to real-time measurement
  if (bestScore > 3000) {
    console.warn('All route moving average scores too high, falling back to real-time measurement');
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
    return list[bestIndex];
  }

  console.log(`Final selection: ${bestUrl} (Score: ${bestScore.toFixed(0)})`);
  return bestUrl;
};
