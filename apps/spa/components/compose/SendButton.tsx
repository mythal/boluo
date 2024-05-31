import { Edit, PaperPlane } from '@boluo/icons';
import { type FC } from 'react';
import { useIntl } from 'react-intl';
import { useComposeError } from '../../hooks/useComposeError';
import { InComposeButton } from './InComposeButton';
import { useTooltip } from '../../hooks/useTooltip';
import { TooltipBox } from '../common/TooltipBox';

interface Props {
  isEditing?: boolean;
  send: () => Promise<void>;
}

export const SendButton: FC<Props> = ({ isEditing = false, send }) => {
  const intl = useIntl();

  const { showTooltip, refs, getFloatingProps, getReferenceProps, floatingStyles } = useTooltip('top-end');
  const composeError = useComposeError();
  const title = isEditing
    ? intl.formatMessage({ defaultMessage: 'Edit' })
    : intl.formatMessage({ defaultMessage: 'Send' });
  return (
    <div className="flex-shrink-0 self-end py-1 pr-1" ref={refs.setReference} {...getReferenceProps()}>
      <InComposeButton onClick={() => send()} disabled={composeError !== null} title={title}>
        {isEditing ? <Edit /> : <PaperPlane />}
      </InComposeButton>
      <TooltipBox show={showTooltip} style={floatingStyles} ref={refs.setFloating} {...getFloatingProps()} defaultStyle>
        {title}
      </TooltipBox>
    </div>
  );
};
