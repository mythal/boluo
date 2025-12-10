import { type FC, useState } from 'react';
import type { EntityOf } from '@boluo/api';
import { FormattedMessage, useIntl } from 'react-intl';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react';
import clsx from 'clsx';
import { TooltipBox } from '../TooltipBox';

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
  const [showCopied, setShowCopied] = useState(false);
  const text = source.substring(start, start + len);

  const { refs, floatingStyles } = useFloating({
    open: showCopied,
    placement: 'top',
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      } catch {
        // do nothing
        return;
      }
    }
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 1500);
  };
  const title = intl.formatMessage({ defaultMessage: 'Click to copy' });
  return (
    <>
      <code
        ref={refs.setReference}
        className={clsx(
          'EntityCode bg-surface-muted border-border-default hover:border-border-strong font-pixel cursor-pointer rounded-sm border px-1 not-italic shadow-xs',
          'active:relative active:top-px active:shadow-none',
        )}
        role="button"
        title={title}
        onClick={void onCopy}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            void onCopy();
          }
        }}
        tabIndex={0}
      >
        {text}
      </code>
      <TooltipBox
        defaultStyle
        show={showCopied}
        // False positive
        // eslint-disable-next-line react-hooks/refs
        ref={refs.setFloating}
        style={floatingStyles}
      >
        <FormattedMessage defaultMessage="Copied" />
      </TooltipBox>
    </>
  );
};
