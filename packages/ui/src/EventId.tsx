'use client';
import {
  autoUpdate,
  flip,
  offset,
  shift,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole,
} from '@floating-ui/react';
import { type FC, useState } from 'react';
import { TooltipBox } from './TooltipBox';
import { FormattedMessage } from 'react-intl';

export const EventId: FC<{ eventId: string }> = ({ eventId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [offset(4), flip(), shift()],
    whileElementsMounted: autoUpdate,
  });

  const hover = useHover(context, { move: false });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, {
    role: 'tooltip',
  });

  const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, dismiss, role]);
  return (
    <>
      <span
        className="underline decoration-dashed"
        ref={refs.setReference}
        {...getReferenceProps()}
      >
        {eventId.slice(0, 8)}
      </span>

      <TooltipBox
        defaultStyle
        show={isOpen}
        // False positive
        // eslint-disable-next-line react-hooks/refs
        ref={refs.setFloating}
        style={floatingStyles}
        {...getFloatingProps()}
      >
        <FormattedMessage defaultMessage="Please provide this ID when reporting the prolblem." />
      </TooltipBox>
    </>
  );
};

export default EventId;
