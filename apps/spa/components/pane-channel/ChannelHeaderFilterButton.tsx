import { ChevronDown, Filter } from '@boluo/icons';
import { useAtomValue } from 'jotai';
import { FC } from 'react';
import { Button } from '@boluo/ui/Button';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { SidebarHeaderButton } from '../sidebar/SidebarHeaderButton';

interface Props {
  on: boolean;
  toggle: () => void;
}

const Dot: FC = () => <div className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-blue-600 shadow-md" />;

export const ChannelHeaderFilterButton: FC<Props> = ({ on, toggle }) => {
  const { filterAtom } = useChannelAtoms();
  const filter = useAtomValue(filterAtom);
  return (
    <div className="relative flex items-stretch">
      <SidebarHeaderButton onClick={toggle} active={on}>
        <Filter />
      </SidebarHeaderButton>
      {filter !== 'ALL' && <Dot />}
    </div>
  );
};
