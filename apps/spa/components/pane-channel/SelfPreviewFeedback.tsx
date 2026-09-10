import { useIntl } from 'react-intl';
import Icon from '@boluo/ui/Icon';
import TriangleAlert from '@boluo/icons/TriangleAlert';
import HelpCircle from '@boluo/icons/HelpCircle';
import { ButtonInline } from '@boluo/ui/ButtonInline';
import { FloatingBox } from '@boluo/ui/FloatingBox';
import { useFloatingSetters } from '@boluo/ui/hooks/useFloatingSetters';
import { useState } from 'react';
import {
  autoUpdate,
  flip,
  offset,
  shift,
  FloatingPortal,
  useFloating,
  useClick,
  useDismiss,
  useRole,
  useInteractions,
} from '@floating-ui/react';
import { useComposeIssues } from '../../hooks/useComposeIssues';
import {
  composeFeedback,
  updateFeedbackPopover,
  type ComposeFeedbackItem,
  type FeedbackPopoverState,
} from '../compose/feedback';

const FeedbackPopover = ({
  items,
  errorCount,
  open,
  onOpenChange,
}: {
  items: ComposeFeedbackItem[];
  errorCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const statusOnly = errorCount === 0;
  const intl = useIntl();
  const { refs, context, floatingStyles } = useFloating({
    open,
    onOpenChange,
    placement: 'top-end',
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });
  const { setReference, setFloating } = useFloatingSetters(refs);
  const click = useClick(context);
  // Handle Escape before other keyboard shortcuts.
  const dismiss = useDismiss(context, { capture: { escapeKey: true } });
  const role = useRole(context, { role: 'tooltip' });
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss, role]);
  const label = statusOnly
    ? intl.formatMessage({ defaultMessage: 'Message status' })
    : intl.formatMessage({ defaultMessage: 'Message error' });
  return (
    <>
      <ButtonInline
        ref={setReference}
        aria-label={label}
        aria-expanded={open}
        aria-pressed={open}
        className="w-full shrink-0 gap-1 px-0"
        {...getReferenceProps()}
      >
        <Icon
          icon={statusOnly ? HelpCircle : TriangleAlert}
          className={statusOnly ? 'text-text-muted' : 'text-state-danger-text'}
        />
        {errorCount > 1 && (
          <span className="text-state-danger-text tabular-nums">{errorCount}</span>
        )}
      </ButtonInline>
      <span role="status" className="sr-only">
        {items.map(({ message }) => message).join('\n')}
      </span>
      {open && (
        <FloatingPortal>
          <FloatingBox
            ref={setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="font-ui z-50 max-h-[min(20rem,calc(100dvh-1rem))] max-w-[min(28rem,calc(100vw-1rem))] overflow-y-auto px-3 py-2 text-sm break-words whitespace-pre-line"
          >
            {items.length > 1 ? (
              <ul className="list-disc space-y-1 pl-4">
                {items.map(({ key, message }) => (
                  <li key={key}>{message}</li>
                ))}
              </ul>
            ) : (
              items[0]?.message
            )}
          </FloatingBox>
        </FloatingPortal>
      )}
    </>
  );
};

export const SelfPreviewFeedback = () => {
  const issues = useComposeIssues();
  const intl = useIntl();
  const items = composeFeedback(intl, issues);
  const errorCount = items.filter((item) => item.kind === 'error').length;
  const [popover, setPopover] = useState<FeedbackPopoverState>({ errorKeys: [], open: false });
  const nextPopover = updateFeedbackPopover(popover, items);
  if (nextPopover !== popover) setPopover(nextPopover);
  return (
    <span className="inline-flex w-10 shrink-0">
      {items.length > 0 && (
        <FeedbackPopover
          items={items}
          errorCount={errorCount}
          open={popover.open}
          onOpenChange={(open) => setPopover((previous) => ({ ...previous, open }))}
        />
      )}
    </span>
  );
};
