import { Archive } from '@boluo/icons';
import { useAtom } from 'jotai';
import { type FC } from 'react';
import { FormattedMessage } from 'react-intl';
import Icon from '@boluo/ui/Icon';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { SidebarHeaderButton } from '../sidebar/SidebarHeaderButton';
import { useTooltip } from '@boluo/common/hooks/useTooltip';
import { TooltipBox } from '@boluo/ui/TooltipBox';

export const ChannelHeaderFilterShowArchive: FC = () => {
  const { showArchivedAtom } = useChannelAtoms();
  const [show, setShow] = useAtom(showArchivedAtom);
  const { showTooltip, refs, getFloatingProps, getReferenceProps, floatingStyles } = useTooltip();
  return (
    <>
      <div ref={refs.setReference} {...getReferenceProps()}>
        <SidebarHeaderButton size="small" active={show} onClick={() => setShow((x) => !x)}>
          <span>
            <Icon icon={Archive} />
          </span>
          <span className="hidden @xl:inline">
            <FormattedMessage defaultMessage="Archived" />
          </span>
        </SidebarHeaderButton>
      </div>
      <TooltipBox
        show={showTooltip}
        style={floatingStyles}
        {...getFloatingProps()}
        ref={refs.setFloating}
        defaultStyle
      >
        <FormattedMessage defaultMessage="Show archived messages" />
      </TooltipBox>
    </>
  );
};
