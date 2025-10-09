import clsx from 'clsx';
import { ChevronDown, TriangleAlert } from '@boluo/icons';
import { useEffect, useMemo, useState, type FC, type ReactNode } from 'react';
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
import { type MemberWithUser } from '@boluo/api';
import Icon from '@boluo/ui/Icon';
import { Delay } from '../Delay';
import { FallbackIcon } from '@boluo/ui/FallbackIcon';
import { useChannelAtoms } from '../../hooks/useChannelAtoms';
import { useAtomValue, useSetAtom } from 'jotai';
import { useVirtualKeybroadChange } from '../../hooks/useVirtualKeybroadChange';

interface Props {
  name: string | undefined | null;
  inGame: boolean;
  color: string;
  isMaster: boolean;
  self: boolean;
  isPreview?: boolean;
  member: MemberWithUser;
}

export const NameEditable: FC<Props> = ({ name, inGame, color, member }) => {
  const { composeFocusedAtom, hideSelfPreviewTimeoutAtom } = useChannelAtoms();
  const setSelfPreviewLock = useSetAtom(hideSelfPreviewTimeoutAtom);
  const [isOpen, setIsOpen] = useState(false);
  const isEmptyName = name === '' || name == null;
  const composeFocused = useAtomValue(composeFocusedAtom);
  const forceOpen = inGame && isEmptyName && composeFocused;
  useEffect(() => {
    if (forceOpen) setIsOpen(true);
  }, [forceOpen]);
  useEffect(() => {
    const now = Date.now();
    if (isOpen && !forceOpen) {
      setSelfPreviewLock((timestamp) => Math.max(timestamp, now + 1000 * 24));
    } else if (!isOpen) {
      setSelfPreviewLock(now + 1000 * 6);
    }
  }, [forceOpen, isOpen, setSelfPreviewLock]);
  const icon: ReactNode = useMemo(() => {
    return (
      <Icon
        icon={ChevronDown}
        className={clsx(
          'text inline-block h-[1em] w-[1em] transition-all duration-100',
          isOpen ? 'rotate-180' : 'text-text-muted',
        )}
      />
    );
  }, [isOpen]);

  const { refs, floatingStyles, context, update } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: 'top-end',
    // The hide middleware will cause the keyboard flickering in Android
    middleware: [
      flip({ mainAxis: true, crossAxis: false }),
      shift(),
      offset({ mainAxis: 0, crossAxis: 0 }),
    ],
    whileElementsMounted: autoUpdate,
  });

  useVirtualKeybroadChange(update);

  const click = useClick(context);
  const dismiss = useDismiss(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss]);

  return (
    <>
      <NameBox
        interactive
        pressed={isOpen}
        color={color}
        ref={refs.setReference}
        icon={icon}
        {...getReferenceProps()}
      >
        {isEmptyName ? (
          <span className="font-pixel text-[12.5px]">
            <Delay fallback={<FallbackIcon />}>
              <Icon icon={TriangleAlert} className="mr-1" />
            </Delay>
            <span>
              <FormattedMessage defaultMessage="Need A Name" />
            </span>
          </span>
        ) : (
          name
        )}
      </NameBox>

      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            className="bg-pane-bg z-20 rounded-sm border px-4 py-3 shadow"
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
