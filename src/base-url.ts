export const baseUrlList = [
  'https://boluo.chat',
  'https://raylet.boluo.chat',
  'https://cdn.boluo.chat',
  'https://gce.boluo.chat',
];

const testBaseUrl = async (baseUrl: string): Promise<number> => {
  const start = performance.now();
  try {
    await fetch(baseUrl + '/api/users/get_me', { method: 'GET', credentials: 'include' });
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
  const end = performance.now();
  return end - start;
};

export const selectBestBaseUrl = async (block?: string): Promise<string> => {
  const list = baseUrlList.filter((url) => url !== block);
  const responseMsList = await Promise.all(list.map((url) => testBaseUrl(url)));
  console.log(responseMsList);
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
