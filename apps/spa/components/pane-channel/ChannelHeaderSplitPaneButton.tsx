import { SplitHorizontal } from '@boluo/icons';
import { type FC } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { usePaneSplit } from '../../hooks/usePaneSplit';
import { SidebarHeaderButton } from '../sidebar/SidebarHeaderButton';
import { useTooltip } from '@boluo/common/hooks/useTooltip';
import { TooltipBox } from '@boluo/ui/TooltipBox';

export const ChannelHeaderSplitPaneButton: FC = () => {
  const intl = useIntl();
  const dup = usePaneSplit();
  const { showTooltip, refs, getFloatingProps, getReferenceProps, floatingStyles } =
    useTooltip('bottom');
  return (
    <div className="inline-flex" ref={refs.setReference} {...getReferenceProps()}>
      <SidebarHeaderButton
        onClick={dup}
        title={intl.formatMessage({ defaultMessage: 'Split pane' })}
      >
        <SplitHorizontal className="rotate-90 md:rotate-0" />
        <span className="sr-only">
          <FormattedMessage defaultMessage="Split" />
        </span>
      </SidebarHeaderButton>
      <TooltipBox
        show={showTooltip}
        style={floatingStyles}
        ref={refs.setFloating}
        {...getFloatingProps()}
        defaultStyle
      >
        <FormattedMessage defaultMessage="Split" />
      </TooltipBox>
    </div>
  );
};
