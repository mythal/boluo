import Gamemaster from '@boluo/icons/Gamemaster';
import TriangleAlert from '@boluo/icons/TriangleAlert';
import { useMemo, useState, type FC } from 'react';
import { FormattedMessage } from 'react-intl';
import { NameBox } from '@boluo/ui/chat/NameBox';
import { useMessageColor } from '../../hooks/useMessageColor';
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
import Icon from '@boluo/ui/Icon';
import { Delay } from '@boluo/ui/Delay';
import { FallbackIcon } from '@boluo/ui/FallbackIcon';
import { NameUserPanel } from './NameUserPanel';

interface Props {
  name: string | undefined | null;
  inGame: boolean;
  userId: string;
  isMaster: boolean;
  self: boolean;
  isPreview?: boolean;
  messageColor?: string | null | undefined;
}

export const Name: FC<Props> = ({ name, isMaster, inGame, userId, messageColor }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { refs, floatingStyles, middlewareData, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: 'top-start',
    middleware: [
      flip({ mainAxis: true, crossAxis: false }),
      shift(),
      offset({ mainAxis: 4, crossAxis: -4 }),
      hide(),
    ],
    whileElementsMounted: autoUpdate,
  });
  const click = useClick(context);
  const dismiss = useDismiss(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss]);
  const isEmptyName = name === '' || name == null;
  const color = useMessageColor(userId, inGame, messageColor);
  const masterIcon = useMemo(
    () => <Icon icon={Gamemaster} className="inline-block h-[1em] w-[1em]" />,
    [],
  );
  return (
    <>
      <NameBox
        pressed={isOpen}
        interactive={userId != null}
        color={color}
        icon={isMaster ? masterIcon : undefined}
        ref={refs.setReference}
        {...getReferenceProps()}
      >
        {isEmptyName ? (
          <span className="font-pixel text-[12.5px]">
            <Delay fallback={<FallbackIcon />}>
              <Icon className="mr-1" icon={TriangleAlert} />
            </Delay>
            <FormattedMessage defaultMessage="No Name" />
          </span>
        ) : (
          name
        )}
      </NameBox>
      {isOpen && userId && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className={middlewareData.hide?.referenceHidden === true ? 'hidden' : ''}
          >
            <NameUserPanel userId={userId} />
          </div>
        </FloatingPortal>
      )}
    </>
  );
};
