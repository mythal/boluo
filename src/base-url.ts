export const baseUrlList = (() => {
  const { host } = window.location;
  if (host.endsWith('stage.boluo.chat')) {
    return [
      'https://stage.boluo.chat',
      'https://raylet-stage.boluo.chat',
      'https://gce-stage.boluo.chat',
      'https://cloudflare-stage.boluo.chat',
    ];
  }
  if (host.startsWith('localhost')) {
    return ['http://localhost:3000'];
  }
  if (host.startsWith('127.0.0.1')) {
    return ['http://127.0.0.1:3000'];
  }
  return ['https://boluo.chat', 'https://raylet.boluo.chat', 'https://cloudflare.boluo.chat', 'https://gce.boluo.chat'];
})();

const FAILED = Number.MAX_SAFE_INTEGER;

export const getDefaultBaseUrl = (): string => {
  const { host } = window.location;
  if (host.endsWith('stage.boluo.chat')) {
    return 'https://stage.boluo.chat';
  }
  if (host.startsWith('localhost')) {
    return 'http://localhost:3000';
  }
  if (host.startsWith('127.0.0.1')) {
    return 'http://127.0.0.1:3000';
  }
  return 'https://boluo.chat';
};

const testBaseUrl = async (baseUrl: string): Promise<number> => {
  const start = performance.now();
  try {
    const response = await fetch(baseUrl + '/api/users/get_me', { method: 'GET', credentials: 'include' });
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
