import EllipsisVertical from '@boluo/icons/EllipsisVertical';
import { type FC } from 'react';
import { PaneHeaderButton } from '@boluo/ui/PaneHeaderButton';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { useAtomValue } from 'jotai';
import { useTooltip } from '@boluo/ui/hooks/useTooltip';
import { FormattedMessage } from 'react-intl';
import { TooltipBox } from '@boluo/ui/TooltipBox';

interface Props {
  on: boolean;
  toggle: () => void;
}

const Dot: FC = () => (
  <div className="Dot absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-blue-600 shadow-md" />
);

export const ChannelHeaderMoreButton: FC<Props> = ({ on, toggle }) => {
  const { filterAtom } = useChannelAtoms();
  const filter = useAtomValue(filterAtom);
  const { showTooltip, refs, getFloatingProps, getReferenceProps, floatingStyles } = useTooltip();

  return (
    <div
      className="ChannelHeaderMoreButton inline-flex"
      ref={refs.setReference}
      {...getReferenceProps()}
    >
      <PaneHeaderButton onClick={toggle} active={on} className="relative">
        <EllipsisVertical
          className={`transition-transform duration-100 ${on ? 'rotate-0' : 'rotate-90'}`}
        />
        {filter !== 'ALL' && <Dot />}
      </PaneHeaderButton>
      <TooltipBox
        show={showTooltip}
        ref={refs.setFloating}
        style={floatingStyles}
        {...getFloatingProps()}
        defaultStyle
      >
        <FormattedMessage defaultMessage="More" />
      </TooltipBox>
    </div>
  );
};
