import useSWR from 'swr';

export type MeasureResult = number | 'TIMEOUT' | 'ERROR';

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

export const useBaseUrlDelay = (baseUrl: string): MeasureResult | 'LOADING' => {
  const { data } = useSWR([baseUrl, 'mesure'], () => measure(baseUrl), { refreshInterval: 3000 });
  if (!data) {
    return 'LOADING';
  } else {
    return data;
  }
};
