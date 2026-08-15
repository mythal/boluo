import { type FC } from 'react';
import type { EntityOf } from '@boluo/api';
import { FormattedMessage, useIntl } from 'react-intl';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react';
import clsx from 'clsx';
import { TooltipBox } from '../TooltipBox';
import { useCopyText } from '../hooks/useCopyText';
import { useFloatingSetters } from '../hooks/useFloatingSetters';

interface Props {
  source: string;
  entity: EntityOf<'Code'>;
}

export const EntityCode: FC<Props> = ({
  source,
  entity: {
    child: { start, len },
  },
}) => {
  const intl = useIntl();
  const { copied: showCopied, copy } = useCopyText();
  const text = source.substring(start, start + len);

  const { refs, floatingStyles } = useFloating({
    open: showCopied,
    placement: 'top',
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });
  const { setReference, setFloating } = useFloatingSetters(refs);

  const title = intl.formatMessage({ defaultMessage: 'Click to copy' });
  return (
    <>
      <code
        ref={setReference}
        className={clsx(
          'EntityCode bg-surface-muted border-border-default hover:border-border-strong font-pixel cursor-pointer rounded-sm border px-1 not-italic shadow-xs',
          'active:relative active:top-px active:shadow-none',
        )}
        role="button"
        title={title}
        onClick={() => {
          void copy(text);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            void copy(text);
          }
        }}
        tabIndex={0}
      >
        {text}
      </code>
      <TooltipBox defaultStyle show={showCopied} ref={setFloating} style={floatingStyles}>
        <FormattedMessage defaultMessage="Copied" />
      </TooltipBox>
    </>
  );
};
