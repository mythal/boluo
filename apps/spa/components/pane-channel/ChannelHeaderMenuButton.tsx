import { EllipsisVertical } from '@boluo/icons';
import { type FC } from 'react';
import { SidebarHeaderButton } from '../sidebar/SidebarHeaderButton';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { useAtomValue } from 'jotai';
import { useTooltip } from '../../hooks/useTooltip';
import { FormattedMessage } from 'react-intl';
import { TooltipBox } from '@boluo/ui';

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
  const { showTooltip, refs, getFloatingProps, getReferenceProps, floatingStyles } = useTooltip();

  return (
    <div className="inline-flex" ref={refs.setReference} {...getReferenceProps()}>
      <SidebarHeaderButton onClick={toggle} active={on} className="relative">
        <EllipsisVertical className={`transition-transform duration-100 ${on ? 'rotate-0' : 'rotate-90'}`} />
        {filter !== 'ALL' && <Dot />}
      </SidebarHeaderButton>
      <TooltipBox show={showTooltip} ref={refs.setFloating} style={floatingStyles} {...getFloatingProps()} defaultStyle>
        <FormattedMessage defaultMessage="More" />
      </TooltipBox>
    </div>
  );
};
