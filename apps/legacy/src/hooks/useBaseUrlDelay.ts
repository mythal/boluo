import useSWR from 'swr';
import { probeBaseUrl, type MeasureResult } from '../route-selection';

export type { MeasureResult };

export const useBaseUrlDelay = (baseUrl: string): MeasureResult | 'LOADING' => {
  const { data } = useSWR([baseUrl, 'measure'], () => probeBaseUrl(baseUrl), {
    refreshInterval: 3000,
  });
  return data ?? 'LOADING';
};
