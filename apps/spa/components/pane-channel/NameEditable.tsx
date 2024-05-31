import clsx from 'clsx';
import { ChevronDown } from '@boluo/icons';
import { useMemo, useState, type FC, type ReactNode } from 'react';
import { FormattedMessage } from 'react-intl';
import {
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
} from '@floating-ui/react';
import { NameBox } from './NameBox';
import { NameEditContent } from './NameEditContent';
import { type Member } from '@boluo/api';
import Icon from '@boluo/ui/Icon';

interface Props {
  name: string | undefined | null;
  inGame: boolean;
  color: string;
  isMaster: boolean;
  self: boolean;
  isPreview?: boolean;
  member: Member;
}

export const NameEditable: FC<Props> = ({ name, inGame, color, member }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isEmptyName = name === '' || name == null;
  const forceOpen = inGame && isEmptyName;
  let shouldOpen = isOpen;
  if (forceOpen && !isOpen) {
    shouldOpen = true;
  }
  const icon: ReactNode = useMemo(() => {
    return (
      <Icon
        icon={ChevronDown}
        className={clsx(
          'text inline-block h-[1em] w-[1em] transition-all duration-100',
          shouldOpen ? 'rotate-180' : 'text-text-lighter',
        )}
      />
    );
  }, [shouldOpen]);

  const { refs, floatingStyles, context } = useFloating({
    open: shouldOpen,
    onOpenChange: setIsOpen,
    placement: 'top-end',
    // The hide middleware will cause the keyboard flickering in Android
    middleware: [flip({ mainAxis: true, crossAxis: false }), shift(), offset({ mainAxis: 4, crossAxis: -4 })],
    whileElementsMounted: autoUpdate,
  });

  const click = useClick(context, { enabled: !forceOpen });
  const dismiss = useDismiss(context, { enabled: !forceOpen });

  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss]);

  return (
    <>
      <NameBox
        interactive
        pressed={shouldOpen}
        color={inGame ? color : undefined}
        ref={refs.setReference}
        icon={icon}
        {...getReferenceProps()}
      >
        {isEmptyName ? (
          <span className="text-error-400 italic">
            <FormattedMessage defaultMessage="Need A Name" />
          </span>
        ) : (
          name
        )}
      </NameBox>

      {shouldOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            className="bg-pane-bg z-20 rounded-sm border px-4 py-3 shadow-lg"
            style={floatingStyles}
            {...getFloatingProps()}
          >
            <NameEditContent member={member} />
          </div>
        </FloatingPortal>
      )}
    </>
  );
};
