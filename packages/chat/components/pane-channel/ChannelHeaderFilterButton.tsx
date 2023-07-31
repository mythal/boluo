import { ChevronDown, Filter } from 'icons';
import { useAtomValue } from 'jotai';
import { FC } from 'react';
import { Button } from 'ui/Button';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';

interface Props {
  on: boolean;
  toggle: () => void;
}

const Dot: FC = () => <div className="absolute w-2 h-2 -right-1 -top-1 rounded-full bg-blue-600 shadow-md" />;

export const ChannelHeaderFilterButton: FC<Props> = ({ on, toggle }) => {
  const { filterAtom } = useChannelAtoms();
  const filter = useAtomValue(filterAtom);
  return (
    <div className="relative flex items-stretch">
      <Button data-small onClick={toggle} data-active={on}>
        <Filter />
        <ChevronDown
          data-on={on}
          className="data-[on=true]:rotate-180 transition-transform duration-200 text-surface-500 data-[on=true]:text-surface-600"
        />
      </Button>
      {filter !== 'ALL' && <Dot />}
    </div>
  );
};
