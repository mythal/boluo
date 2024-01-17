import { PersonRunning } from 'icons';
import { Delay } from '../Delay';

export const IsActionIndicator = () => {
  return (
    <span className="text-surface-400 mr-1 select-none text-sm">
      <Delay fallback={null}>
        <PersonRunning className="mr-1 inline" />
      </Delay>
      Action
    </span>
  );
};
