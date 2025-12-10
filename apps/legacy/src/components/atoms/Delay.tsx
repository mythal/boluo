import { type MeasureResult } from '../../hooks/useBaseUrlDelay';

export const Delay = ({ delay }: { delay: MeasureResult | 'LOADING' }) => {
  if (delay === 'LOADING') {
    return <span>...</span>;
  } else if (delay === 'ERROR') {
    return <span>出错</span>;
  } else if (delay === 'TIMEOUT') {
    return <span>超时</span>;
  }
  return <span>{delay.toFixed(2)}ms</span>;
};
