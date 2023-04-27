import { PersonRunning } from 'icons';
import { Delay } from '../Delay';

export const IsActionIndicator = () => {
  return (
    <span className="text-sm text-surface-400 select-none">
      <Delay fallback={null}>
        <PersonRunning className="inline mr-1" />
      </Delay>
      Action
    </span>
  );
};
