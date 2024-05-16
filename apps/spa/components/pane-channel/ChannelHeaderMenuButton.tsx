import { EllipsisVertical } from '@boluo/icons';
import { FC } from 'react';
import { SidebarHeaderButton } from '../sidebar/SidebarHeaderButton';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { useAtomValue } from 'jotai';

interface Props {
  on: boolean;
  toggle: () => void;
}

const Dot: FC = () => (
  <div className="bg-dot-normal absolute -right-0.5 -top-0.5 h-[6px] w-[6px] rounded-full shadow-md" />
);

export const ChannelHeaderMoreButton: FC<Props> = ({ on, toggle }) => {
  const { filterAtom } = useChannelAtoms();
  const filter = useAtomValue(filterAtom);
  return (
    <SidebarHeaderButton onClick={toggle} active={on} className="relative">
      <EllipsisVertical className={`transition-transform duration-100 ${on ? 'rotate-0' : 'rotate-90'}`} />
      {filter !== 'ALL' && <Dot />}
    </SidebarHeaderButton>
  );
};
