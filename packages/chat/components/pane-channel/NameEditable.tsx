import clsx from 'clsx';
import { ChevronDown } from '@boluo/icons';
import { useState, type FC, type ReactNode } from 'react';
import { FormattedMessage } from 'react-intl';
import {
  FloatingPortal,
  autoUpdate,
  flip,
  hide,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
} from '@floating-ui/react';
import { NameBox } from './NameBox';
import { NameEditContent } from './NameEditContent';

interface Props {
  name: string | undefined | null;
  inGame: boolean;
  color: string;
  isMaster: boolean;
  self: boolean;
  isPreview?: boolean;
  myId: string;
  channelId: string;
}

export const NameEditable: FC<Props> = ({ name, isMaster, inGame, color, myId, channelId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isEmptyName = name === '' || name == null;
  if (inGame && isEmptyName && !isOpen) {
    setIsOpen(true);
  }
  const icon: ReactNode = (
    <ChevronDown
      className={clsx(
        'text inline-block h-[1em] w-[1em] transition-all duration-100',
        isOpen ? 'rotate-180' : 'text-text-lighter',
      )}
    />
  );

  const { refs, floatingStyles, middlewareData, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: 'top-end',
    middleware: [flip({ mainAxis: true, crossAxis: false }), shift(), offset({ mainAxis: 4, crossAxis: -4 }), hide()],
    whileElementsMounted: autoUpdate,
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss]);

  return (
    <>
      <NameBox editable color={inGame ? color : undefined} ref={refs.setReference} icon={icon} {...getReferenceProps()}>
        {isEmptyName ? (
          <span className="text-error-400 italic">
            <FormattedMessage defaultMessage="Need A Name" />
          </span>
        ) : (
          name
        )}
      </NameBox>

      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            className={clsx(
              'bg-pane-bg z-20 rounded-sm border px-4 py-3 shadow-lg',
              middlewareData.hide?.referenceHidden === true && 'hidden',
            )}
            style={floatingStyles}
            {...getFloatingProps()}
          >
            <NameEditContent myId={myId} channelId={channelId} />
          </div>
        </FloatingPortal>
      )}
    </>
  );
};
