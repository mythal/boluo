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

const timeout = (ms: number): Promise<{ type: 'TIMEOUT' }> => {
  return new Promise((resolve) => {
    window.setTimeout(() => {
      resolve({ type: 'TIMEOUT' });
    }, ms);
  });
};

const getInfo = async (
  baseUrl: string,
): Promise<{ type: 'APP_INFO'; version: string } | { type: 'ERROR'; error: Event }> => {
  const ws = new WebSocket(
    baseUrl.replace(/^http/, 'ws') +
      `/api/events/connect?mailbox=00000000-0000-0000-0000-000000000000`,
  );
  return new Promise((resolve) => {
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data) as {
        body: { type: 'APP_INFO'; info: { version: string } };
      };
      if (data.body.type === 'APP_INFO') {
        ws.close();
        resolve({ type: 'APP_INFO', version: data.body.info.version });
      }
    };
    ws.onerror = (e) => {
      resolve({ type: 'ERROR', error: e });
    };
  });
};

const testBaseUrl = async (baseUrl: string): Promise<number> => {
  const start = performance.now();
  try {
    const response = await Promise.race([getInfo(baseUrl), timeout(1000)]);
    if (response.type === 'TIMEOUT') {
      return FAILED;
    }
    if (response.type === 'ERROR') {
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
