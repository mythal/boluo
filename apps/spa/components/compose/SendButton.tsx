import Edit from '@boluo/icons/Edit';
import PaperPlane from '@boluo/icons/PaperPlane';
import { type FC } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useComposeError } from '../../hooks/useComposeError';
import { InComposeButton } from './InComposeButton';
import { useTooltip } from '@boluo/ui/hooks/useTooltip';
import { TooltipBox } from '@boluo/ui/TooltipBox';
import { useSettings } from '../../hooks/useSettings';
import { Kbd } from '@boluo/ui/Kbd';
import { isApple } from '@boluo/utils/browser';

interface Props {
  isEditing?: boolean;
  send: () => Promise<void>;
}

export const SendButton: FC<Props> = ({ isEditing = false, send }) => {
  const intl = useIntl();

  const { enterSend } = useSettings();
  const { showTooltip, refs, getFloatingProps, getReferenceProps, floatingStyles } =
    useTooltip('top-end');
  const composeError = useComposeError();
  const title = isEditing
    ? intl.formatMessage({ defaultMessage: 'Edit' })
    : intl.formatMessage({ defaultMessage: 'Send' });
  return (
    <div className="shrink-0 self-end py-1 pr-1" ref={refs.setReference} {...getReferenceProps()}>
      <InComposeButton onClick={() => void send()} disabled={composeError != null} label={title}>
        {isEditing ? <Edit /> : <PaperPlane />}
      </InComposeButton>
      <TooltipBox
        show={showTooltip}
        style={floatingStyles}
        ref={refs.setFloating}
        {...getFloatingProps()}
        defaultStyle
      >
        <div className="text-base">{title}</div>
        <div className="pb-1 text-sm">
          <span>
            <FormattedMessage defaultMessage="Press" />{' '}
          </span>
          {enterSend ? (
            <Kbd variant="small">↵</Kbd>
          ) : (
            <>
              <Kbd variant="small">{isApple() ? '⌘' : 'Ctrl'}</Kbd>
              <span> + </span>
              <Kbd variant="small">↵</Kbd>
            </>
          )}
        </div>
      </TooltipBox>
    </div>
  );
};
