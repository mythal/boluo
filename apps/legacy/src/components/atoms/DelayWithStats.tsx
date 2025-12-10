import { type MeasureResult } from '../../hooks/useBaseUrlDelay';
import {
  getRouteScore,
  getRouteSuccessRate,
  getAllRouteStats,
} from '../../hooks/useBaseUrlMovingAverage';

interface Props {
  delay: MeasureResult | 'LOADING';
  url: string;
  showStats?: boolean;
}

export const DelayWithStats = ({ delay, url, showStats = false }: Props) => {
  const renderDelay = () => {
    if (delay === 'LOADING') {
      return <span>...</span>;
    } else if (delay === 'ERROR') {
      return <span>Error</span>;
    } else if (delay === 'TIMEOUT') {
      return <span>Timeout</span>;
    }
    return <span>{delay.toFixed(2)}ms</span>;
  };

  const renderStats = () => {
    if (!showStats) return null;

    const score = getRouteScore(url);
    const successRate = getRouteSuccessRate(url);
    const allStats = getAllRouteStats();
    const stats = allStats.get(url);

    if (!stats) {
      return <div style={{ fontSize: '10px', color: '#888' }}>No data</div>;
    }

    return (
      <div style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>
        <div>Moving Avg: {stats.ema.toFixed(1)}ms</div>
        <div>Success Rate: {(successRate * 100).toFixed(1)}%</div>
        <div>Score: {score.toFixed(0)}</div>
        <div>Samples: {stats.sampleCount}</div>
      </div>
    );
  };

  return (
    <div>
      {renderDelay()}
      {renderStats()}
    </div>
  );
};
