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
  const responseMsList = await Promise.all(list.map((url) => testBaseUrl(url)));
  let bestIndex = 0;
  let bestMs = responseMsList[0];
  for (let i = 1; i < responseMsList.length; i++) {
    const ms = responseMsList[i];
    if (ms < bestMs) {
      bestIndex = i;
      bestMs = ms;
    }
  }
  return baseUrlList[bestIndex];
};
