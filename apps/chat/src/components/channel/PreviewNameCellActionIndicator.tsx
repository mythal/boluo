import { PersonRunning } from 'icons';
import { Delay } from '../Delay';

export const PreviewNameCellActionIndicator = () => {
  return (
    <span className="text-sm text-surface-400">
      <Delay fallback={null}>
        <PersonRunning className="inline mr-1" />
      </Delay>
      Action
    </span>
  );
};
