import { PersonRunning } from '@boluo/icons';
import { Delay } from '../Delay';

export const IsActionIndicator = () => {
  return (
    <span className="text-text-muted mr-1 text-sm select-none">
      <Delay fallback={null}>
        <PersonRunning className="mr-1 inline" />
      </Delay>
      Action
    </span>
  );
};
