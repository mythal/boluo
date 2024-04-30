import { PersonRunning } from '@boluo/icons';
import { Delay } from '../Delay';

export const IsActionIndicator = () => {
  return (
    <span className="text-message-action mr-1 select-none text-sm">
      <Delay fallback={null}>
        <PersonRunning className="mr-1 inline" />
      </Delay>
      Action
    </span>
  );
};
